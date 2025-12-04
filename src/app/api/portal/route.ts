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
import { getWorkingStream } from '@/services/streamingSources';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { getOptionalApiKeys } from '@/lib/env';

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

/**
 * Authenticate or register STB device via Supabase
 */
async function authenticateDevice(mac: string) {
    const supabase = createServiceRoleClient();
    const email = `${mac.replace(/:/g, '')}@stb.filmify.com`;
    const password = mac; // Simple password for STB (MAC address)

    // 1. Try to sign in (checks if user exists and password matches)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInData.user) {
        return signInData.user;
    }

    // 2. If sign in fails, try to create new user
    // (Only if error is "Invalid login credentials" or similar, but we'll try create anyway)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            full_name: `STB Device (${mac})`,
            is_stb: true,
            mac_address: mac
        }
    });

    if (createError) {
        // If create fails, maybe the user exists but password was wrong (changed?)
        // In that case, we might want to reset the password or just fail.
        // For now, let's try to get the user by listing (fallback) if create says "already registered"
        // Also catch 'email_exists' code which Supabase returns
        if (createError.message.includes('already registered') || createError.code === 'email_exists') {
            // Fallback: List users (not ideal but works for now if sign in failed)
            // Note: signIn might fail if email is not confirmed, but we set email_confirm: true
            const { data: users } = await supabase.auth.admin.listUsers();
            const existing = users?.users.find(u => u.email === email);
            if (existing) return existing;
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
    const mac = searchParams.get('mac') || request.headers.get('x-user-mac') || '';

    console.log(`STB Request: type=${type}, action=${action}, mac=${mac}`);

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
            const linkVodId = params.get('vod_id') || '';
            if (!linkVodId) return NextResponse.json({ error: 'Missing vod_id' }, { status: 400 });

            // 1. Get External IDs (IMDB)
            const externalIds = await getExternalIds(parseInt(linkVodId));
            const imdbId = externalIds.imdb_id;

            if (!imdbId) {
                return NextResponse.json({ error: 'IMDB ID not found' }, { status: 404 });
            }

            // 2. Get Real Stream URL
            // Try movie first, then TV if needed
            let streamResult = await getWorkingStream(imdbId, 'es', true, undefined, undefined, parseInt(linkVodId));

            if (!streamResult) {
                // Try as TV show (S1E1 default)
                streamResult = await getWorkingStream(imdbId, 'es', false, 1, 1, parseInt(linkVodId));
            }

            if (!streamResult) {
                return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
            }

            return NextResponse.json({
                js: {
                    id: linkVodId,
                    cmd: streamResult.url,
                    storage: 'local',
                    streamer_id: '1',
                    load: 100,
                    token: generateToken(mac)
                }
            });

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
