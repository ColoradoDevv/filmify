import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/env';

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
};

// ── Middleware ────────────────────────────────────────────────────────────────

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Always pass through static assets and API/auth routes
    if (isMatch(pathname, PASSTHROUGH_PREFIXES)) {
        return NextResponse.next();
    }

    let response = NextResponse.next({ request: { headers: request.headers } });

    // Apply security headers to all responses
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));

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
    let supabase: any;
    try {
        supabase = createServerClient(url, anonKey, {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    // Recreate response so cookies can be set on it
                    response = NextResponse.next({ request: { headers: request.headers } });
                    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        });
    } catch (err) {
        // If creating the client fails (bad config / runtime), log and continue
        console.error('[middleware] failed to create Supabase server client', err);
        // Continue without a supabase client — treat as unauthenticated but do not crash
        supabase = null;
    }

    // ── IP ban check ──────────────────────────────────────────────────────────
    const ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        '127.0.0.1';
    if (supabase) {
        try {
            const { data: banned } = await supabase
                .from('ip_bans')
                .select('id')
                .eq('ip_address', ip)
                .single();
            if (banned) {
                return new NextResponse('Access Denied: Your IP has been banned.', { status: 403 });
            }
        } catch (err) {
            // Table may not exist yet or query failed. Log for observability but don't break the request.
            console.warn('[middleware] ip_bans check failed (ignoring):', err);
        }
    }

    // ── Get current user ──────────────────────────────────────────────────────
    let user: any = null;
    if (supabase) {
        try {
            const result = await supabase.auth.getUser();
            user = result?.data?.user ?? null;
        } catch (err) {
            console.error('[middleware] supabase.auth.getUser failed (treating as unauthenticated):', err);
            user = null;
        }
    }

    const isProtected = isMatch(pathname, PROTECTED_PREFIXES);
    const isAdmin     = pathname.startsWith(ADMIN_PREFIX);
    const isAuthPage  = isMatch(pathname, AUTH_ROUTES);

    // 1. Unauthenticated user → protected/admin route: redirect to login
    //    Preserve the intended destination so we can redirect back after login.
    if (!user && (isProtected || isAdmin)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Admin route: verify role
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
            if (!isAdminRole) {
                return NextResponse.redirect(new URL('/browse', request.url));
            }
        } catch (err) {
            console.error('[middleware] unexpected error during admin role check', err);
            return NextResponse.redirect(new URL('/browse', request.url));
        }
    }

    // 3. Authenticated user → auth page: redirect to browse (or ?next param)
    if (user && isAuthPage && !pathname.startsWith('/confirm-email')) {
        const next = request.nextUrl.searchParams.get('next') ?? '/browse';
        // Only allow relative paths to prevent open redirect
        const safePath = next.startsWith('/') ? next : '/browse';
        return NextResponse.redirect(new URL(safePath, request.url));
    }

    return response;
}

export const config = {
    matcher: [
        // Run on all paths except static files
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
    ],
};
