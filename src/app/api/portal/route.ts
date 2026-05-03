import { NextRequest, NextResponse } from 'next/server';
import {
    getPopular,
    getTrending,
    getMovieDetails,
    getTVDetails,
    discoverMovies,
    discoverTV,
    getGenres,
    getTVGenres,
    getImageUrl,
    getExternalIds
} from '@/lib/tmdb/service';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHmac } from 'crypto';

import { getOptionalApiKeys, getPortalDeviceSecret } from '@/lib/env';

/**
 * Minimal Stalker bootstrap HTML.
 * STBEmu / MAG devices load /portal.php with no params first.
 * This page reads the device MAC via the STB JS API and immediately
 * redirects to the handshake endpoint with the MAC as a query param.
 */
const STALKER_BOOTSTRAP_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>FilmiFy Portal</title></head>
<body>
<script>
(function() {
  var mac = '';
  try { mac = window.stb ? window.stb.GetDeviceInfo().mac : ''; } catch(e) {}
  if (!mac) { try { mac = window.stbApi ? window.stbApi.getDeviceInfo().mac : ''; } catch(e) {} }
  if (!mac) { try { mac = window.gSTB ? window.gSTB.GetDeviceInfo().mac : ''; } catch(e) {} }
  if (mac) {
    document.cookie = 'mac=' + mac + '; path=/';
    window.location.href = '/portal.php?type=stb&action=handshake&mac=' + encodeURIComponent(mac);
  } else {
    document.body.innerHTML = '<p>No se pudo detectar la MAC del dispositivo. Configura la MAC manualmente en la app.</p>';
  }
})();
</script>
</body>
</html>`;

// Configuration
const PORTAL_NAME = 'FilmiFy TV';
const PORTAL_VERSION = '1.0.0';
const TIMEZONE = 'America/New_York';
const BASE_URL = getOptionalApiKeys().appUrl;

/**
 * Helper to generate a token based on MAC address
 */
function generateToken(mac: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(mac + Date.now().toString() + PORTAL_NAME).digest('hex');
}

/**
 * Helper to format TMDB content to Stalker format
 */
function formatContent(item: any, categoryId: string) {
    const isSeries = item.name ? true : false; // TV shows have 'name', movies have 'title'
    const title = item.title || item.name || 'Unknown';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);

    return {
        id: item.id.toString(),
        name: title,
        description: item.overview || '',
        director: '',
        actors: '',
        year: year,
        screenshot_uri: getImageUrl(item.poster_path, 'w500'),
        rating_imdb: item.vote_average || 0,
        rating_count_imdb: item.vote_count || 0,
        added: Math.floor(Date.now() / 1000),
        category_id: categoryId,
        series: isSeries ? '1' : '0',
        hd: '1',
        volume_correction: 0,
        cmd: `${BASE_URL}/api/stream/${item.id}`
    };
}

// Only allow valid MAC addresses (colon or hyphen separated)
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

// Max new device registrations per 24-hour window across the whole portal
const DEVICE_REGISTRATION_DAILY_LIMIT = 500;

/**
 * Authenticate or register STB device via Supabase.
 * - Validates MAC format before touching the DB
 * - Derives a server-side password via HMAC(secret, mac) so that knowing
 *   the MAC address alone is not sufficient to authenticate
 * - Checks a daily registration cap to prevent user-creation floods
 * - Reuses existing accounts on re-handshake (no duplicate creates)
 */
async function authenticateDevice(mac: string) {
    if (!MAC_REGEX.test(mac)) {
        throw new Error('Invalid MAC address format');
    }

    const deviceSecret = getPortalDeviceSecret();
    if (!deviceSecret) {
        throw new Error('STB portal is not configured (missing PORTAL_DEVICE_SECRET)');
    }

    const supabase = createServiceRoleClient();
    const email = `${mac.replace(/[:-]/g, '').toLowerCase()}@stb.filmify.com`;

    // Derive a server-side password: HMAC-SHA256(secret, mac).
    // The MAC address is public — using it directly as a password (SEC-006)
    // allowed anyone who knew a device's MAC to impersonate it.
    const password = createHmac('sha256', deviceSecret)
        .update(mac.toLowerCase())
        .digest('hex');

    // 1. Try to sign in — fast path for returning devices
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (signInData.user) return signInData.user;

    // 2. New device — enforce daily registration cap before creating anything
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_stb', true)
        .gte('created_at', since);

    if ((count ?? 0) >= DEVICE_REGISTRATION_DAILY_LIMIT) {
        throw new Error('Device registration limit reached. Try again later.');
    }

    // 3. Create the user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: `STB Device (${mac})`,
            is_stb: true,
            mac_address: mac,
        },
    });

    if (createError) {
        // Race condition: another request created the same device between steps 1 and 3
        if (createError.message.includes('already registered') || createError.code === 'email_exists') {
            const { data: signInRetry } = await supabase.auth.signInWithPassword({ email, password });
            if (signInRetry.user) return signInRetry.user;
        }
        console.error('Error creating STB user:', createError);
        throw new Error('Failed to register device');
    }

    return newUser.user;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || '';
    const action = searchParams.get('action') || '';

    // Different Stalker client apps send the MAC in different ways.
    // Check all known locations in order of preference.
    const mac = (
        searchParams.get('mac') ||                          // query param (most common)
        request.headers.get('x-user-mac') ||               // custom header
        request.headers.get('mac') ||                      // some clients use plain "mac"
        request.headers.get('x-mac-address') ||            // alternative header name
        request.cookies.get('mac')?.value ||               // cookie — STBEmu sends MAC here
        ''
    ).trim();

    // Log every request for debugging.
    console.log(`STB Request: type=${type}, action=${action}, mac=${mac || '(none)'}`);
    if (!mac) {
        console.log('STB headers:', Object.fromEntries(request.headers.entries()));
        console.log('STB cookies:', request.cookies.toString());
    }

    // ── Initial portal load (no type/action/mac) ──────────────────────────────
    // STBEmu and MAG devices first load /portal.php with no parameters.
    // The real Stalker middleware responds with an HTML bootstrap page that
    // sets a cookie and loads the portal JS. We serve a minimal redirect page
    // that sets the mac cookie from the User-Agent (MAG devices embed the MAC
    // in the UA string) and then reloads so the JS can start the handshake.
    if (!type && !action && !mac) {
        // Try to extract MAC from User-Agent (MAG devices: "MAG200 stbapp ... mac=XX:XX:XX:XX:XX:XX")
        const ua = request.headers.get('user-agent') || '';
        const uaMac = ua.match(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/)?.[0] || '';

        if (uaMac) {
            // Redirect back with mac as query param so the handshake can proceed.
            const url = new URL(request.url);
            url.searchParams.set('type', 'stb');
            url.searchParams.set('action', 'handshake');
            url.searchParams.set('mac', uaMac);
            const response = NextResponse.redirect(url);
            response.cookies.set('mac', uaMac, { path: '/', sameSite: 'lax' });
            return response;
        }

        // No MAC anywhere — return the Stalker bootstrap HTML.
        // The client JS will read its own MAC and send it on the next request.
        return new NextResponse(STALKER_BOOTSTRAP_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }

    if (!mac) {
        return NextResponse.json({ error: 'MAC address required' }, { status: 400 });
    }

    try {
        switch (type) {
            case 'stb':
                return await handleSTBRequest(action, mac);
            case 'vod':
                return await handleVODRequest(action, mac, searchParams);
            case 'itv':
                return handleLiveTVRequest(action, mac, searchParams);
            default:
                return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
        }
    } catch (error) {
        console.error('Portal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function handleSTBRequest(action: string, mac: string) {
    switch (action) {
        case 'handshake':
            try {
                await authenticateDevice(mac);
                const crypto = require('crypto');
                return NextResponse.json({
                    js: {
                        token: generateToken(mac),
                        random: crypto.randomBytes(16).toString('hex'),
                        mac: mac,
                        support_token: true
                    }
                });
            } catch (e) {
                return NextResponse.json({ error: 'Authentication failed' }, { status: 403 });
            }

        case 'get_profile':
            try {
                const user = await authenticateDevice(mac);
                if (!user) throw new Error('User not found');
                return NextResponse.json({
                    js: {
                        id: user.id,
                        name: user.user_metadata.full_name || 'FilmiFy User',
                        status: 1,
                        expire: Math.floor(Date.now() / 1000) + 31536000, // +1 year
                        created: Math.floor(new Date(user.created_at).getTime() / 1000),
                        mac: mac,
                        phone: '',
                        tariff_plan: 'Premium',
                        status_msg: 'Active'
                    }
                });
            } catch (e) {
                return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            }

        case 'get_modules':
            return NextResponse.json({
                js: {
                    vod: true,
                    live: true,
                    radio: false,
                    epg: true,
                    pvr: false,
                    favorites: true,
                    search: true
                }
            });

        case 'get_settings':
            return NextResponse.json({
                js: {
                    portal_name: PORTAL_NAME,
                    portal_version: PORTAL_VERSION,
                    timezone: TIMEZONE,
                    logo: `${BASE_URL}/logo-icon.svg`,
                    background: `${BASE_URL}/stb/background.jpg`
                }
            });

        default:
            return NextResponse.json({ error: 'Unknown STB action' }, { status: 400 });
    }
}

async function handleVODRequest(action: string, mac: string, params: URLSearchParams) {
    switch (action) {
        case 'get_categories':
            const categories = [
                { id: 'movies_popular', title: 'Películas Populares', alias: 'movies_popular' },
                { id: 'tv_popular', title: 'Series de TV', alias: 'tv_popular' },
                { id: 'genre_28', title: 'Acción', alias: 'genre_28' },
                { id: 'genre_35', title: 'Comedia', alias: 'genre_35' },
                { id: 'genre_18', title: 'Drama', alias: 'genre_18' },
                { id: 'genre_878', title: 'Ciencia Ficción', alias: 'genre_878' },
                { id: 'genre_27', title: 'Terror', alias: 'genre_27' },
                { id: 'genre_10749', title: 'Romance', alias: 'genre_10749' }
            ];
            return NextResponse.json({ js: categories });

        case 'get_ordered_list':
            const category = params.get('category') || 'movies_popular';
            const page = parseInt(params.get('p') || '1');

            let results: any[] = [];
            let tmdbData: any = {};

            if (category === 'movies_popular') {
                tmdbData = await getPopular(page);
            } else if (category === 'tv_popular') {
                tmdbData = await getTrending('tv', 'week', page);
            } else if (category.startsWith('genre_')) {
                const genreId = parseInt(category.replace('genre_', ''));
                tmdbData = await discoverMovies({ genre: genreId, page });
            }

            if (tmdbData.results) {
                results = tmdbData.results.map((item: any) => formatContent(item, category));
            }

            return NextResponse.json({
                js: {
                    data: results,
                    total_items: tmdbData.total_results || results.length,
                    max_page_items: 20,
                    selected_item: 0
                }
            });

        case 'get_vod_info':
            const vodId = params.get('vod_id') || '';
            if (!vodId) return NextResponse.json({ error: 'Missing vod_id' }, { status: 400 });

            let details: any = null;
            try {
                details = await getMovieDetails(parseInt(vodId));
            } catch (e) {
                try {
                    details = await getTVDetails(parseInt(vodId));
                } catch (e2) {
                    console.error('Error fetching details', e2);
                }
            }

            if (!details) return NextResponse.json({ js: {} });

            const director = details.credits?.crew?.find((p: any) => p.job === 'Director')?.name || '';
            const actors = details.credits?.cast?.slice(0, 5).map((p: any) => p.name).join(', ') || '';
            const genres = details.genres?.map((g: any) => g.name).join(', ') || '';

            return NextResponse.json({
                js: {
                    id: details.id,
                    name: details.title || details.name,
                    description: details.overview,
                    director: director,
                    actors: actors,
                    year: (details.release_date || details.first_air_date || '').substring(0, 4),
                    screenshot_uri: getImageUrl(details.backdrop_path, 'original'),
                    rating_imdb: details.vote_average,
                    duration: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
                    genres_str: genres
                }
            });

        case 'create_link':
            // Streaming functionality has been removed
            return NextResponse.json({ error: 'Streaming service unavailable' }, { status: 404 });

        default:
            return NextResponse.json({ error: 'Unknown VOD action' }, { status: 400 });
    }
}

function handleLiveTVRequest(action: string, mac: string, params: URLSearchParams) {
    switch (action) {
        case 'get_all_channels':
            const channels = [
                {
                    id: '1',
                    name: 'FilmiFy Channel 1',
                    number: '1',
                    cmd: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                    logo: `${BASE_URL}/logo-icon.svg`,
                    genre_title: 'Movies'
                }
            ];
            return NextResponse.json({
                js: {
                    data: channels,
                    total_items: channels.length
                }
            });

        case 'create_link':
            const channelId = params.get('cmd') || '';
            return NextResponse.json({
                js: {
                    cmd: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                    token: generateToken(mac)
                }
            });

        default:
            return NextResponse.json({ error: 'Unknown Live TV action' }, { status: 400 });
    }
}
