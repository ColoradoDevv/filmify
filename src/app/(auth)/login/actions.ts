'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOptionalApiKeys, getSupabaseConfig } from '@/lib/env';
import { redirect } from 'next/navigation';

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

    // Defensive: ensure Supabase config is present (helpful if envs are misconfigured in prod)
    const { url: _url, anonKey: _anonKey } = getSupabaseConfig();
    if (!_url || !_anonKey) {
        console.error('[login] Supabase is not configured (missing URL/ANON_KEY)');
        return { error: 'El servicio de autenticación no está disponible.' };
    }

    let supabase: any;
    try {
        supabase = await createClient();
    } catch (err) {
        console.error('[login] failed to create Supabase server client', err);
        return { error: 'Error interno: servicio de autenticación no disponible.' };
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
            ...(hcaptchaEnabled && captchaToken ? { options: { captchaToken } } : {}),
        });

        if (error) {
            // Some Supabase errors include friendly messages (captcha, email not confirmed)
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('email not confirmed') || msg.includes('email not verified')) {
                console.warn('[login] email not confirmed:', { email });
                return redirect(`/confirm-email?email=${encodeURIComponent(email)}`);
            }

            console.warn('[login] signInWithPassword returned error', { email, error });
            return { error: LOGIN_INVALID_CREDENTIALS };
        }
    } catch (err) {
        // signInWithPassword may throw in some edge cases — don't let it bubble to the runtime
        console.error('[login] signInWithPassword threw an exception', { email, err });
        return { error: 'Error interno al iniciar sesión. Inténtalo más tarde.' };
    }

    // Redirect to the originally requested page, or /browse as default.
    // Only allow relative paths to prevent open redirect attacks.
    const next = String(formData.get('next') ?? '').trim();
    const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/browse';
    return redirect(safePath);
}
