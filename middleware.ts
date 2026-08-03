import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/env';

/** Generate a cryptographically random base64 nonce using the Web Crypto API.
 *  Works in both Edge Runtime and Node.js — no 'crypto' module import needed. */
function generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
}

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

    const nonce = generateNonce();
    const csp = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' https:`,
        `style-src 'self' 'unsafe-inline' https:`,
        `img-src 'self' data: blob: https:`,
        `media-src 'self' blob: https:`,
        `connect-src 'self' https: wss:`,
        `font-src 'self' data: https:`,
        `frame-src https:`,
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
        const isSafe = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && (() => {
            try { return new URL(next, 'https://filmify.me').hostname === 'filmify.me'; } catch { return false; }
        })();
        return NextResponse.redirect(new URL(isSafe ? next : '/browse', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
    ],
};
