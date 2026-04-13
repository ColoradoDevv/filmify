'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOptionalApiKeys, getSupabaseConfig } from '@/lib/env';

export type ResendSignupConfirmationResult = {
    error: string;
    ok?: boolean;
    /** Si el correo ya estaba confirmado en Auth (no se reenvía enlace). */
    status?: 'already_confirmed';
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatAuthError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('captcha')) {
        return 'La verificación de seguridad falló. Completa el captcha de nuevo e inténtalo otra vez.';
    }
    return message || 'No se pudo solicitar el reenvío.';
}

async function resolveAppOrigin(): Promise<string> {
    const { appUrl } = getOptionalApiKeys();
    const hdrs = await headers();
    const host = hdrs.get('host');
    const proto = hdrs.get('x-forwarded-proto') ?? 'http';
    if (host) return `${proto}://${host}`;
    return appUrl.replace(/\/$/, '');
}

/**
 * Reenvío de confirmación: intenta primero un correo propio vía Resend + enlace
 * generado por Supabase Admin (más fiable que el SMTP por defecto de Supabase).
 * Si no hay Resend o falla, usa auth.resend del proyecto.
 */
export async function resendSignupConfirmation(input: {
    email: string;
    captchaToken?: string | null;
}): Promise<ResendSignupConfirmationResult> {
    const email = input.email.trim().toLowerCase();
    const captchaToken = input.captchaToken?.trim() ?? '';
    const hcaptchaEnabled = Boolean(getOptionalApiKeys().hcaptchaSiteKey);

    if (!email || !EMAIL_RE.test(email)) {
        return { error: 'Introduce un correo electrónico válido.' };
    }
    if (hcaptchaEnabled && !captchaToken) {
        return { error: 'Completa la verificación “No soy un robot” antes de reenviar.' };
    }

    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) {
        return { error: 'El servicio de autenticación no está configurado.' };
    }

    const origin = (await resolveAppOrigin()).replace(/\/$/, '');
    const redirectTo = `${origin}/auth/callback`;
    const { resendApiKey } = getOptionalApiKeys();
    const resendFrom =
        process.env.RESEND_FROM_EMAIL ?? 'FilmiFy <onboarding@resend.dev>';

    if (resendApiKey) {
        try {
            const admin = createAdminClient();
            const { data: profile } = await admin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (profile?.id) {
                const { data: userResp, error: userErr } = await admin.auth.admin.getUserById(profile.id);
                if (!userErr && userResp.user?.email_confirmed_at) {
                    return { error: '', ok: true, status: 'already_confirmed' };
                }

                const { data: linkData, error: genErr } = await admin.auth.admin.generateLink({
                    type: 'magiclink',
                    email,
                    options: { redirectTo },
                });

                const actionLink = linkData?.properties?.action_link;
                if (!genErr && actionLink) {
                    const resend = new Resend(resendApiKey);
                    const mailResult = await resend.emails.send({
                        from: resendFrom,
                        to: email,
                        subject: 'Tu enlace para continuar en FilmiFy',
                        html: `
<p>Hola,</p>
<p>Usa el siguiente botón para confirmar el acceso a tu cuenta y continuar. Si no solicitaste este correo, puedes ignorarlo.</p>
<p style="margin:24px 0">
  <a href="${actionLink}" style="background:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
    Continuar en FilmiFy
  </a>
</p>
<p style="font-size:12px;color:#666">Si el botón no funciona, copia y pega esta URL en el navegador:<br/>${actionLink}</p>
`,
                    });

                    if (!mailResult.error) {
                        return { error: '', ok: true };
                    }
                    console.error('[resendSignupConfirmation] Resend error:', mailResult.error);
                } else {
                    console.warn('[resendSignupConfirmation] generateLink:', genErr?.message);
                }
            }
        } catch (e) {
            console.error('[resendSignupConfirmation] Resend / admin path:', e);
        }
    }

    const anon = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await anon.auth.resend({
        type: 'signup',
        email,
        options: {
            emailRedirectTo: redirectTo,
            ...(hcaptchaEnabled && captchaToken ? { captchaToken } : {}),
        },
    });

    if (error) {
        return { error: formatAuthError(error.message) };
    }

    return { error: '', ok: true };
}
