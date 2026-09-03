import { createServerClient } from '@supabase/ssr';
import { safeInternalPath } from '@/lib/safe-path';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/env';
import ANIME_TMDB_REDIRECTS from '@/lib/anime-tmdb-redirects.json';

/** Generate a cryptographically random base64 nonce using the Web Crypto API.
 *  Works in both Edge Runtime and Node.js — no 'crypto' module import needed.
 *  Solo lo usa /ads/frame (ver isAdFrame más abajo): ese endpoint firma
 *  inline un valor que sí varía por petición (la clave de zona), así que
 *  necesita un nonce de verdad. */
function generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
}

// El documento público NO usa nonce en su CSP (ver más abajo, `scriptSrc`).
//
// Se probó hash-based CSP para los 3 scripts inline propios (GA, consent
// mode, registro del SW) — funciona para ESOS, pero Next.js aplica el nonce
// TAMBIÉN a sus propios scripts internos de hidratación RSC (contenido que
// cambia en cada render, imposible de hashear con una lista fija). Probado
// en local: sin nonce, esos scripts internos violan el CSP igual que los
// nuestros — 8 violaciones distintas en consola, GA y el SW rotos.
//
// Y por documentación oficial de Next (content-security-policy.md): "when
// you use nonces... all pages must be dynamically rendered... Static
// optimization and ISR are disabled... Pages cannot be cached by CDNs." No
// hay término medio — con nonce, ISR y caché de CDN quedan descartados de
// raíz, sea cual sea el resto del código. Dado que el objetivo es que
// Cloudflare cachee las rutas públicas, se opta por `'unsafe-inline'` en su
// lugar (recomendado por la propia guía de Next para apps sin ese
// requisito) — el resto del CSP (orígenes externos, frame-src, object-src
// 'none', JSON-LD ya escapado vía serializeJsonLd) sigue igual de estricto.

// ── Route classification ──────────────────────────────────────────────────────

/**
 * Publicly accessible — no auth required.
 */
const PUBLIC_ROUTES = [
    '/',
    '/browse',
    '/movie',
    '/tv',
    '/search',
    '/live-tv',
    '/editorial',
    '/about',
    '/contact',
    '/legal',
    '/security',
];

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/confirm-email'];

const PROTECTED_PREFIXES = ['/favorites', '/lists', '/settings', '/profile'];
const ADMIN_PREFIX = '/admin';
const PASSTHROUGH_PREFIXES = ['/api/', '/auth/', '/_next/'];

function isMatch(pathname: string, prefixes: string[]): boolean {
    return prefixes.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

// ── IP-ban cache ────────────────────────────────────────────────────────────
const IP_BAN_TTL_MS = 60_000;
const ipBanCache = new Map<string, { banned: boolean; at: number }>();
function getCachedBan(ip: string): boolean | null {
    const hit = ipBanCache.get(ip);
    if (hit && Date.now() - hit.at < IP_BAN_TTL_MS) return hit.banned;
    return null;
}
function setCachedBan(ip: string, banned: boolean): void {
    if (ipBanCache.size > 5_000) ipBanCache.clear();
    ipBanCache.set(ip, { banned, at: Date.now() });
}

// Nota: el consentimiento por región (EEE/UK/CH) ya no se resuelve aquí.
// Antes se calculaba por geo (`cf-ipcountry`) y se publicaba como header para
// que el layout raíz lo leyera con `headers()` — pero esa llamada por sí
// sola bastaba para que Next tratara CUALQUIER página como dinámica (nada de
// ISR), justo lo que le impedía a Cloudflare cachear ninguna ruta. Ahora lo
// resuelve el cliente contra `/api/consent-region` (ver ese route handler y
// `@/lib/consent-region`), que sigue siendo la misma lista de países.

// ── Security headers ──────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
    'X-DNS-Prefetch-Control':    'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options':           'SAMEORIGIN',
    'X-Content-Type-Options':    'nosniff',
    'Referrer-Policy':           'origin-when-cross-origin',
    'Permissions-Policy':        'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
};

// ── Middleware ────────────────────────────────────────────────────────────────
export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isMatch(pathname, PASSTHROUGH_PREFIXES)) {
        return NextResponse.next();
    }

    // ── /tv/[tmdbId] de anime → /anime/[anilistId] (308 permanente) ─────────
    // El anime tiene módulo propio; estas URLs siguen indexadas y deben
    // consolidar su autoridad en la ruta nueva.
    //
    // Va aquí y no en la página porque cuando el redirect se resuelve dentro
    // del Server Component, Next ya ha empezado a hacer streaming y degrada a
    // un `<meta http-equiv="refresh">` en vez de un 308 HTTP. El middleware
    // corre antes de renderizar, así que sí emite el status correcto.
    //
    // El mapa es un snapshot compacto (~57 KB) generado con
    // `node scripts/generate-anime-redirects.mjs`; lo que no esté en él lo
    // cubre el redirect de la propia página, que consulta el mapa completo.
    const tvIdMatch = /^\/tv\/(\d+)\/?$/.exec(pathname);
    if (tvIdMatch) {
        const anilistId = (ANIME_TMDB_REDIRECTS as Record<string, number>)[tvIdMatch[1]];
        if (anilistId) {
            return NextResponse.redirect(new URL(`/anime/${anilistId}`, request.url), 308);
        }
    }

    // El creativo publicitario encadena scripts por varios dominios de la red,
    // imposibles de enumerar. Se le deja `https:` porque está encerrado en un
    // iframe con sandbox y origen opaco (ver components/ads/AdBanner.tsx): lo
    // que cargue ahí no puede tocar el documento que lo contiene.
    const isAdFrame = pathname === '/ads/frame' || pathname.startsWith('/ads/frame/');

    // El nonce solo hace falta en /ads/frame: ese endpoint firma inline un
    // valor que sí varía por petición (la clave de zona). Generarlo siempre
    // es barato, pero solo se adjunta a la petición (x-nonce) porque esa
    // ruta lee la cabecera con headers() en su propio route handler — un
    // Route Handler `force-dynamic`, no una página, así que no afecta a la
    // estaticidad de ninguna otra ruta.
    const nonce = generateNonce();

    let scriptSrc: string;
    if (isAdFrame) {
        scriptSrc = [`'self'`, 'https:', `'nonce-${nonce}'`].join(' ');
    } else {
        // Orígenes de script del documento principal.
        //
        // Antes aquí ponía `https:`, que permite CUALQUIER origen HTTPS —
        // ahora es una lista explícita, y solo con lo que el documento carga
        // de verdad: googletagmanager (Google Analytics) y analytics.filmify.me
        // (analítica propia).
        //
        // 'unsafe-inline': sin nonce (ver nota arriba de por qué no lo lleva
        // el documento), es lo único que permite ejecutar los scripts inline
        // propios (@/lib/inline-scripts) Y los internos de hidratación de
        // Next/React. Elegido deliberadamente sobre mantener el nonce a
        // costa de ISR/caché de CDN — decisión explícita, no un descuido.
        //
        // Los anuncios NO entran aquí: viven en /ads/frame, arriba (con
        // nonce de verdad, porque ahí sí varía por petición). Si algún día se
        // activa el formato «native» (NEXT_PUBLIC_ADSTERRA_NATIVE_SRC, hoy
        // vacío), su script se inyecta en el documento principal y habrá que
        // añadir su origen a esta lista.
        scriptSrc = [
            `'self'`,
            `'unsafe-inline'`,
            'https://www.googletagmanager.com',
            'https://analytics.filmify.me',
            // 'unsafe-eval' SOLO en desarrollo: React lo usa ahí para reconstruir
            // stacktraces que cruzan el límite servidor→cliente, y sin él la
            // consola se llena de un error que no indica ningún fallo real. En
            // producción React nunca llama a eval(), y permitirlo reabriría la
            // ejecución de strings arbitrarios. Next inlinea NODE_ENV al
            // compilar, así que el bundle de producción no contiene ni esta rama.
            ...(process.env.NODE_ENV !== 'production' ? [`'unsafe-eval'`] : []),
        ].join(' ');
    }

    const csp = [
        `default-src 'self'`,
        `script-src ${scriptSrc}`,
        `style-src 'self' 'unsafe-inline' https:`,
        `img-src 'self' data: blob: https:`,
        `media-src 'self' blob: https:`,
        `connect-src 'self' https: wss:`,
        `font-src 'self' data: https:`,
        // 'self': el iframe aislado de publicidad (/ads/frame) es same-origin.
        `frame-src 'self' https:`,
        `frame-ancestors 'self'`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
        `upgrade-insecure-requests`,
    ].join('; ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    let response = NextResponse.next({ request: { headers: requestHeaders } });
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    response.headers.set('Content-Security-Policy', csp);

    const { url, anonKey } = getSupabaseConfig();
    const hasSupabase = !!(url && anonKey);

    if (!hasSupabase) {
        const needsAuth = isMatch(pathname, PROTECTED_PREFIXES) || pathname.startsWith(ADMIN_PREFIX);
        if (needsAuth) return NextResponse.redirect(new URL('/', request.url));
        return response;
    }

    // Visitante anónimo: sin cookie `sb-*` no hay sesión que refrescar. Saltarse
    // auth.getUser() evita que setAll() dispare y recree `response` con
    // Set-Cookie — eso es lo que hace que Cloudflare (y el propio Cache-Control
    // que emite Next para una respuesta con cookies de sesión) traten la
    // petición como no cacheable. El cliente igual se construye: ip_bans se
    // consulta también para anónimos y esa llamada no toca cookies.
    const hasSupabaseSessionCookie = request.cookies.getAll().some(({ name }) => name.startsWith('sb-'));

    // Create Supabase server client once (guarded)
    let supabase: any = null;
    let authError: any = null;
    let user: any = null;

    try {
        supabase = createServerClient(url, anonKey, {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    // Recreate response so cookies can be attached
                    response = NextResponse.next({ request: { headers: requestHeaders } });
                    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
                    response.headers.set('Content-Security-Policy', csp);
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        });

        if (hasSupabaseSessionCookie) {
            try {
                // Attempt to read current user/session. Not fatal if it errors.
                const session = await supabase.auth.getUser();
                user = session?.data?.user ?? null;
                authError = session?.error ?? null;
            } catch (err) {
                console.warn('[middleware] supabase.auth.getUser() failed', err);
                authError = err;
                user = null;
            }
        }
    } catch (err) {
        console.error('[middleware] failed to create Supabase server client', err);
        supabase = null;
        authError = err;
    }

    // ── IP ban check ──────────────────────────────────────────────────────────
    const ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        '127.0.0.1';

    try {
        const cached = getCachedBan(ip);
        if (cached === true) {
            return NextResponse.redirect(new URL('/banned', request.url));
        }

        if (cached === null && supabase) {
            try {
                const { data: rows, error } = await supabase.from('ip_bans').select('id').eq('ip_address', ip).limit(1);
                const banned = !!(rows && rows.length);
                setCachedBan(ip, banned);
                if (banned) return NextResponse.redirect(new URL('/banned', request.url));
            } catch (err) {
                console.error('[middleware] failed to check ip_bans', err);
            }
        }
    } catch (err) {
        console.error('[middleware] unexpected error during ip ban flow', err);
    }

    const isProtected = isMatch(pathname, PROTECTED_PREFIXES);
    const isAdmin = pathname.startsWith(ADMIN_PREFIX);
    const isAuthPage = isMatch(pathname, AUTH_ROUTES);

    // Clear invalid/expired refresh tokens: treat as unauthenticated
    if (authError && (
        authError.message?.includes('Refresh Token Not Found') ||
        authError.message?.includes('Invalid Refresh Token') ||
        authError.code === 'refresh_token_not_found'
    )) {
        const target = (isProtected || isAdmin) ? new URL('/login', request.url) : request.nextUrl;
        const redirectResponse = NextResponse.redirect(target);
        request.cookies.getAll().forEach(({ name }) => {
            if (name.startsWith('sb-')) redirectResponse.cookies.delete(name);
        });
        return redirectResponse;
    }

    if (!user && (isProtected || isAdmin)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (user && isAdmin) {
        if (!supabase) {
            console.error('[middleware] admin check requested but no supabase client available');
            return NextResponse.redirect(new URL('/browse', request.url));
        }

        try {
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (profileErr) {
                console.error('[middleware] failed to fetch profile for admin check', { userId: user.id, profileErr });
                return NextResponse.redirect(new URL('/browse', request.url));
            }

            const isAdminRole = profile?.role === 'admin' || profile?.role === 'super_admin';
            if (!isAdminRole) return NextResponse.redirect(new URL('/browse', request.url));
        } catch (err) {
            console.error('[middleware] unexpected error during admin role check', err);
            return NextResponse.redirect(new URL('/browse', request.url));
        }
    }

    if (user && isAuthPage && !pathname.startsWith('/confirm-email') && !pathname.startsWith('/reset-password')) {
        const next = request.nextUrl.searchParams.get('next') ?? '/browse';
        // SEC-016 — misma regla que en login/actions.ts y MovieCard.
        return NextResponse.redirect(new URL(safeInternalPath(next, '/browse'), request.url));
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
    ],
};
