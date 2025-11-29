import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const protectedRoutes = ['/browse', '/favorites', '/settings'];
    const authRoutes = ['/login', '/register', '/confirm-email'];
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    // 1. Protect private routes
    // If user is NOT logged in and tries to access a protected route -> Redirect to Login
    if (!user && isProtectedRoute) {
        const redirectUrl = new URL('/login', request.url);
        // Optional: Save the return URL to redirect back after login
        // redirectUrl.searchParams.set('next', request.nextUrl.pathname); 
        return NextResponse.redirect(redirectUrl);
    }

    // 2. Prevent authenticated users from accessing auth pages
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
