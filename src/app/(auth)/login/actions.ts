'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOptionalApiKeys } from '@/lib/env';
import { redirect } from 'next/navigation';

/**
 * SEC-016: Validates that a redirect path is a safe relative URL.
 * Rejects anything that could be interpreted as an absolute URL by browsers,
 * including /\example.com, //%09example.com, /%2F%2Fexample.com, etc.
 */
function isSafeRedirectPath(path: string): boolean {
    if (!path || !path.startsWith('/')) return false;
    if (path.startsWith('//')) return false;
    if (path.startsWith('/\\')) return false;
    try {
        // Resolve against a known origin — if the hostname changes, it's unsafe.
        const url = new URL(path, 'https://filmify.me');
        return url.hostname === 'filmify.me';
    } catch {
        return false;
    }
}

export type LoginState = {
    error: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mensaje único ante fallo de acceso (no distinguir usuario inexistente vs contraseña incorrecta). */
const LOGIN_INVALID_CREDENTIALS =
    'El correo o la contraseña son incorrectos o no son válidos. Comprueba tus datos e inténtalo de nuevo.';

export async function loginAction(
    _prevState: LoginState,
    formData: FormData
): Promise<LoginState> {
    const identifier = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const captchaToken = String(formData.get('captchaToken') ?? '');
    const hcaptchaEnabled = Boolean(getOptionalApiKeys().hcaptchaSiteKey);

    if (!identifier || !password) {
        return { error: 'Por favor completa todos los campos' };
    }

    if (hcaptchaEnabled && !captchaToken) {
        return { error: 'Por favor completa el captcha' };
    }

    let email = identifier;

    // If the identifier is not an email, resolve it from the username.
    // This path requires the admin client (service role key). If that's not
    // configured, we fall back to treating the input as email — which will
    // fail the signInWithPassword call below with a generic error, so we
    // don't leak information about whether usernames are resolvable.
    if (!EMAIL_RE.test(identifier)) {
        try {
            const supabaseAdmin = createAdminClient();

            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('username', identifier)
                .maybeSingle();

            if (profileError || !profile) {
                return { error: LOGIN_INVALID_CREDENTIALS };
            }

            const { data: userData, error: userError } =
                await supabaseAdmin.auth.admin.getUserById(profile.id);

            if (userError || !userData.user?.email) {
                return { error: LOGIN_INVALID_CREDENTIALS };
            }

            email = userData.user.email;
        } catch (err) {
            // Service role key missing or admin client exploded — log and
            // bail out with a generic message (do not leak implementation).
            console.error('[login] admin client error:', err);
            return { error: LOGIN_INVALID_CREDENTIALS };
        }
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(hcaptchaEnabled && captchaToken
            ? { options: { captchaToken } }
            : {}),
    });

    if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
            return redirect(`/confirm-email?email=${encodeURIComponent(email)}`);
        }
        return { error: LOGIN_INVALID_CREDENTIALS };
    }

    // SEC-016: validate the redirect target strictly — paths like /\example.com
    // or /%2F%2Fexample.com can be interpreted as absolute URLs by some browsers.
    const next = String(formData.get('next') ?? '').trim();
    return redirect(isSafeRedirectPath(next) ? next : '/browse');
}
