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

/** Publicly accessible — no auth required */
const PUBLIC_ROUTES = [
    '/',                    // landing / call-to-action
    '/contact',
    '/legal',
    '/security',
];

/** Auth pages — redirect to /browse if already logged in */
const AUTH_ROUTES = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/confirm-email',
];

/** Platform routes that require authentication */
const PROTECTED_PREFIXES = [
    '/browse',
    '/favorites',
    '/lists',
    '/live-tv',
    '/movie',
    '/tv',
    '/search',
    '/settings',
    '/profile',
    '/watch-party',
];

/**
 * Content routes that TV devices can access without authentication.
 * Personal routes (favorites, lists, settings, profile, watch-party) still require login.
 */
const TV_PUBLIC_PREFIXES = [
    '/browse',
    '/movie',
    '/tv',
    '/search',
    '/live-tv',
];

/** Admin routes — require admin/super_admin role */
const ADMIN_PREFIX = '/admin';

/** API & auth callback routes — always pass through */
const PASSTHROUGH_PREFIXES = [
    '/api/',
    '/auth/',
    '/_next/',
];

function isMatch(pathname: string, prefixes: string[]): boolean {
    return prefixes.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

// ── Security headers ──────────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
    'X-DNS-Prefetch-Control':    'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options':           'SAMEORIGIN',
    'X-Content-Type-Options':    'nosniff',
    'Referrer-Policy':           'origin-when-cross-origin',
    // SEC-024: restrict browser feature APIs and cross-origin isolation
    'Permissions-Policy':              'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy':      'same-origin',
    'Cross-Origin-Resource-Policy':    'same-origin',
};

/** TV device User-Agent keywords — must stay in sync with src/lib/device-detection.ts */
const TV_UA_KEYWORDS = [
    'tizen', 'webos', 'web0s', 'vidaa', 'android tv', 'google tv', 'googletv',
    'fire tv', 'firetv', 'appletv', 'roku', 'smarttv', 'smart-tv', 'hbbtv',
    'mag200', 'mag250', 'mag254', 'mag256', 'mag322', 'mag349', 'mag351',
    'mag410', 'mag420', 'mag520', 'stbapp', 'qtembedded',
    'formuler', 'crkey', 'chromecast',
];

function isTVUserAgent(ua: string): boolean {
    const lower = ua.toLowerCase();
    return TV_UA_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Always pass through static assets and API/auth routes
    if (isMatch(pathname, PASSTHROUGH_PREFIXES)) {
        return NextResponse.next();
    }

    // Generate a per-request nonce for CSP (base64, 16 bytes = 128 bits)
    const nonce = generateNonce();

    // Build CSP with nonce — allows Next.js inline scripts and GTM consent init
    // while blocking all other inline scripts (XSS protection).
    const csp = [
        `default-src 'self'`,
        // 'self' + nonce for Next.js hydration scripts + GTM consent init
        // 'unsafe-eval' is NOT included — no eval() allowed
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

    // Forward nonce to page components via request header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    let response = NextResponse.next({ request: { headers: requestHeaders } });

    // Apply security headers to all responses
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    response.headers.set('Content-Security-Policy', csp);

    const { url, anonKey } = getSupabaseConfig();
    const hasSupabase = !!(url && anonKey);

    // ── No Supabase configured ────────────────────────────────────────────────
    if (!hasSupabase) {
        const needsAuth =
            isMatch(pathname, PROTECTED_PREFIXES) ||
            pathname.startsWith(ADMIN_PREFIX);
        if (needsAuth) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return response;
    }

    // ── Build Supabase client (refreshes session cookie if needed) ────────────
    const supabase = createServerClient(url, anonKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
                response = NextResponse.next({ request: { headers: requestHeaders } });
                Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
                response.headers.set('Content-Security-Policy', csp);
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    // ── IP ban check ──────────────────────────────────────────────────────────
    const ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        '127.0.0.1';
    try {
        const { data: banned } = await supabase
            .from('ip_bans')
            .select('id')
            .eq('ip_address', ip)
            .single();
        if (banned) {
            return new NextResponse('Access Denied: Your IP has been banned.', { status: 403 });
        }
    } catch { /* table may not exist yet */ }

    // ── Get current user ──────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();

    const isProtected = isMatch(pathname, PROTECTED_PREFIXES);
    const isAdmin     = pathname.startsWith(ADMIN_PREFIX);
    const isAuthPage  = isMatch(pathname, AUTH_ROUTES);

    // 1. Unauthenticated user → protected/admin route: redirect to login
    //    TV devices get a pass on content routes — they can't easily log in.
    //    Preserve the intended destination so we can redirect back after login.
    if (!user && (isProtected || isAdmin)) {
        const ua = request.headers.get('user-agent') || '';
        if (isTVUserAgent(ua) && isMatch(pathname, TV_PUBLIC_PREFIXES)) {
            // TV device accessing a content route — allow without auth.
            return response;
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Admin route: verify role
    if (user && isAdmin) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdminRole = profile?.role === 'admin' || profile?.role === 'super_admin';
        if (!isAdminRole) {
            return NextResponse.redirect(new URL('/browse', request.url));
        }
    }

    // 3. Authenticated user → auth page: redirect to browse (or ?next param)
    if (user && isAuthPage && !pathname.startsWith('/confirm-email')) {
        const next = request.nextUrl.searchParams.get('next') ?? '/browse';
        // SEC-016: validate strictly — /\example.com and similar bypass naive checks
        const isSafe = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && (() => {
            try { return new URL(next, 'https://filmify.me').hostname === 'filmify.me'; } catch { return false; }
        })();
        return NextResponse.redirect(new URL(isSafe ? next : '/browse', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        // Run on all paths except static files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
    ],
};
