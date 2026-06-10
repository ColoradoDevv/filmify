import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getOptionalApiKeys } from '@/lib/env';

// Escape HTML so user-supplied values can't inject markup/links into the
// email we send to the admin inbox (stored-HTML-injection / phishing vector).
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Conservative email-format check. Also rejects header-injection characters
// (newlines) that could be abused via the reply-to field.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LEN = 100;
const MAX_EMAIL_LEN = 254;
const MAX_MESSAGE_LEN = 5000;

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
    const ip =
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
        'unknown';
    const supabase = createServiceRoleClient();

    // Check rate limit (5 requests per hour per IP)
    const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour
    const LIMIT = 5;

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
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const email = typeof body?.email === 'string' ? body.email.trim() : '';
        const message = typeof body?.message === 'string' ? body.message.trim() : '';

        // Presence validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Todos los campos son requeridos' },
                { status: 400 }
            );
        }

        // Format + length validation (prevents header injection and abuse)
        if (!EMAIL_REGEX.test(email) || email.length > MAX_EMAIL_LEN) {
            return NextResponse.json(
                { error: 'Email inválido' },
                { status: 400 }
            );
        }
        if (name.length > MAX_NAME_LEN || message.length > MAX_MESSAGE_LEN) {
            return NextResponse.json(
                { error: 'Uno o más campos exceden la longitud permitida' },
                { status: 400 }
            );
        }

        // Escape everything before it lands in the HTML email body.
        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

        // Send email
        const data = await resend.emails.send({
            from: 'FilmiFy Contact <onboarding@resend.dev>',
            to: contactEmail,
            subject: `Nuevo mensaje de contacto de ${name}`.slice(0, 200),
            replyTo: email,
            text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
            html: `
                <h1>Nuevo Mensaje de Contacto</h1>
                <p><strong>Nombre:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${safeMessage}</p>
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
