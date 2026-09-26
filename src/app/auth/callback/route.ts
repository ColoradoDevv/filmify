import { NextResponse } from 'next/server';
import { createSupabaseServerClient as createClient } from '@/server/repositories/supabase';
import { safeInternalPath } from '@/lib/safe-path';

/**
 * Hosts a los que se permite redirigir tras el login cuando el proxy manda
 * `x-forwarded-host`. La cabecera la puede falsificar el cliente si Nginx no
 * la sobrescribe, así que NUNCA se usa tal cual (SEC-016): solo estos.
 */
const ALLOWED_FORWARDED_HOSTS = new Set(['filmify.me', 'www.filmify.me']);

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // SEC-016: `next` se reconstruye como ruta interna — `//evil.com/x` o
    // `/\evil` caen al fallback en vez de sacer al usuario del sitio.
    const next = safeInternalPath(searchParams.get('next'), '/browse');

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`);
            }
            // La cabecera es falsificable: solo hosts conocidos, si no origin.
            const host = forwardedHost?.split(',')[0]?.trim().toLowerCase() ?? '';
            if (host && ALLOWED_FORWARDED_HOSTS.has(host)) {
                return NextResponse.redirect(`https://${host}${next}`);
            }
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
