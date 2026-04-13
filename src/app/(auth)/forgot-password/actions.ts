'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getOptionalApiKeys } from '@/lib/env';

export type ForgotPasswordState = {
    error: string;
    success?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function forgotPasswordAction(
    _prevState: ForgotPasswordState,
    formData: FormData
): Promise<ForgotPasswordState> {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const captchaToken = String(formData.get('captchaToken') ?? '');
    const hcaptchaEnabled = Boolean(getOptionalApiKeys().hcaptchaSiteKey);

    if (!email || !EMAIL_RE.test(email)) {
        return { error: 'Por favor ingresa un email válido' };
    }

    if (hcaptchaEnabled && !captchaToken) {
        return { error: 'Por favor completa el captcha' };
    }

    // Build the redirect URL the user will land on after clicking the link.
    const { appUrl } = getOptionalApiKeys();
    let origin = appUrl;
    if (!origin || origin === 'http://localhost:3000') {
        const hdrs = await headers();
        const host = hdrs.get('host');
        const proto = hdrs.get('x-forwarded-proto') ?? 'http';
        if (host) origin = `${proto}://${host}`;
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
        ...(hcaptchaEnabled && captchaToken ? { captchaToken } : {}),
    });

    if (error) {
        // Don't leak whether the email exists. Supabase already returns a
        // generic success even for non-existent addresses, but we still
        // sanitize errors that aren't user-facing (e.g. service config).
        console.error('[forgot-password] resetPasswordForEmail error:', error);
        // Tell the user it succeeded regardless to prevent enumeration.
        return { error: '', success: true };
    }

    return { error: '', success: true };
}
