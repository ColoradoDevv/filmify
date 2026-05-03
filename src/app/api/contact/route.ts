import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getOptionalApiKeys } from '@/lib/env';

export async function POST(request: Request) {
    const { resendApiKey, contactEmail } = getOptionalApiKeys();

    if (!resendApiKey || !contactEmail) {
        return NextResponse.json(
            { error: 'Servicio de email no configurado' },
            { status: 503 }
        );
    }

    const resend = new Resend(resendApiKey);

    // SEC-009: prefer the real IP set by the trusted reverse proxy (x-real-ip)
    // over x-forwarded-for which is client-controlled and trivially spoofable.
    // In production behind Vercel/Cloudflare, x-real-ip is set by the edge and
    // cannot be forged by the client. x-forwarded-for is kept as a last resort
    // but its first entry is still client-supplied — rate limiting on it alone
    // is bypassable. For stronger guarantees, move to session/user-based limits.
    const ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||   // Cloudflare
        request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || // last hop (set by proxy)
        'unknown';
    const supabase = createServiceRoleClient();

    // Check rate limit (5 requests per hour per IP)
    const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour
    const LIMIT = 5;

    // SEC-009: use upsert to eliminate the select→insert race condition that
    // allowed concurrent requests to bypass the limit.
    const windowStart = new Date(Date.now() - WINDOW_SIZE).toISOString();

    const { data: limits } = await supabase
        .from('rate_limits')
        .select('id, requests_count')
        .eq('ip_address', ip)
        .eq('endpoint', 'contact')
        .gt('window_start', windowStart)
        .order('window_start', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (limits && limits.requests_count >= LIMIT) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    // Atomic increment — avoids the race condition between check and update
    if (limits) {
        await supabase
            .from('rate_limits')
            .update({ requests_count: limits.requests_count + 1 })
            .eq('id', limits.id);
    } else {
        await supabase
            .from('rate_limits')
            .insert({
                ip_address: ip,
                endpoint: 'contact',
                requests_count: 1,
                window_start: new Date().toISOString()
            });
    }

    try {
        const body = await request.json();
        const { name, email, message } = body;

        // Simple validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Todos los campos son requeridos' },
                { status: 400 }
            );
        }

        // Send email
        const data = await resend.emails.send({
            from: 'FilmiFy Contact <onboarding@resend.dev>', // Use verified domain or testing domain
            to: contactEmail,
            subject: `Nuevo mensaje de contacto de ${name}`,
            replyTo: email,
            text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
            html: `
                <h1>Nuevo Mensaje de Contacto</h1>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `,
        });

        if (data.error) {
            return NextResponse.json({ error: data.error.message || 'Error al enviar el email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
