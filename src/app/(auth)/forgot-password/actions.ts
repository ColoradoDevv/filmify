'use server';

import { headers } from 'next/headers';
import { createSupabaseServerClient as createClient } from '@/server/repositories/supabase';
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

    if (!email || !EMAIL_RE.test(email)) {
        return { error: 'Por favor ingresa un email válido' };
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

export type VerifyRecoveryCodeState = {
    error: string;
    success?: boolean;
};

/**
 * Verifica el código de recuperación que llega por correo (plantilla con
 * {{ .Token }}). Al validarlo, Supabase emite una sesión (cookies vía
 * @supabase/ssr) con la que /reset-password puede llamar a updateUser.
 */
export async function verifyRecoveryCodeAction(
    _prevState: VerifyRecoveryCodeState,
    formData: FormData
): Promise<VerifyRecoveryCodeState> {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const token = String(formData.get('code') ?? '').replace(/\D/g, '');

    if (!email || !EMAIL_RE.test(email)) {
        return { error: 'Falta el email. Vuelve a solicitar el código.' };
    }

    if (token.length < 6 || token.length > 10) {
        return { error: 'El código no es válido. Revisa el correo que te enviamos.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    });

    if (error) {
        console.error('[forgot-password] verifyOtp error:', error.message);
        return { error: 'Código inválido o expirado. Solicita uno nuevo.' };
    }

    return { error: '', success: true };
}
