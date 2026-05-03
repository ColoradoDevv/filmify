import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/env';

export default async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const { url, anonKey } = getSupabaseConfig();
    const hasSupabase = url && anonKey;

    // --- SECURITY HEADERS ---
    const securityHeaders = {
        'X-DNS-Prefetch-Control': 'on',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'origin-when-cross-origin',
    };

    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // If Supabase is not configured, allow public access but block admin/protected routes
    if (!hasSupabase) {
        const protectedRoutes = ['/browse', '/favorites', '/settings', '/admin', '/movie', '/tv', '/live-tv', '/search'];
        const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

        if (isProtectedRoute) {
            // If trying to access protected route without DB, redirect to home
            return NextResponse.redirect(new URL('/', request.url));
        }
        return response;
    }

    const supabase = createServerClient(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Create new response for cookie updates
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    // Set cookies on response only
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IP Blocking Check
    // Use forwarded headers to determine the client IP in edge middleware.
    const ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        '127.0.0.1';
    try {
        const { data: bannedIp } = await supabase
            .from('ip_bans')
            .select('id')
            .eq('ip_address', ip)
            .single();

        if (bannedIp) {
            return new NextResponse('Access Denied: Your IP has been banned.', { status: 403 });
        }
    } catch {
        // Ignore error if table doesn't exist or query fails
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const protectedRoutes = ['/browse', '/favorites', '/settings', '/movie', '/tv', '/live-tv', '/search'];
    const authRoutes = ['/login', '/register', '/confirm-email'];
    const adminRoutes = ['/admin'];

    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    const isAdminRoute = adminRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    // 1. Protect private routes
    // If user is NOT logged in and tries to access a protected route -> Redirect to Login
    if (!user && (isProtectedRoute || isAdminRoute)) {
        const redirectUrl = new URL('/login', request.url);
        return NextResponse.redirect(redirectUrl);
    }

    // 2. Protect Admin routes
    if (user && isAdminRoute) {
        // Fetch user profile to check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
            // Redirect unauthorized users to home
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 3. Prevent authenticated users from accessing auth pages
    // If user IS logged in and tries to access login/register -> Redirect to Browse
    // Note: We allow /confirm-email even if logged in, in case they need to verify
    if (user && isAuthRoute && !request.nextUrl.pathname.startsWith('/confirm-email')) {
        return NextResponse.redirect(new URL('/browse', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (svg, png, etc)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
