'use server';

import { createSupabaseServerClient as createClient, createSupabaseStatelessAdminClient as createAdminClient } from '@/server/repositories/supabase';
import { getSupabaseConfig } from '@/lib/env';
import { redirect } from 'next/navigation';

/**
 * SEC-016: Validates that a redirect path is a safe relative URL.
 */
function isSafeRedirectPath(path: string): boolean {
    if (!path || !path.startsWith('/')) return false;
    if (path.startsWith('//')) return false;
    if (path.startsWith('/\\')) return false;
    try {
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

const LOGIN_INVALID_CREDENTIALS =
    'El correo o la contraseña son incorrectos o no son válidos. Comprueba tus datos e inténtalo de nuevo.';

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
    const identifier = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const captchaToken = String(formData.get('captchaToken') ?? '');

    if (!identifier || !password) {
        return { error: 'Por favor completa todos los campos' };
    }

    let email = identifier;

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
            console.error('[login] admin client error:', err);
            return { error: LOGIN_INVALID_CREDENTIALS };
        }
    }

    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) {
        console.error('[login] Supabase is not configured (missing URL/ANON_KEY)');
        return { error: 'El servicio de autenticación no está disponible.' };
    }

    let supabase;
    try {
        supabase = await createClient();
    } catch (err) {
        console.error('[login] failed to create Supabase server client', err);
        return { error: 'Error interno: servicio de autenticación no disponible.' };
    }

    try {
        const signInOptions = captchaToken ? { options: { captchaToken } } : {};
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
            ...signInOptions,
        });

        if (error) {
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('email not confirmed') || msg.includes('email not verified')) {
                console.warn('[login] email not confirmed:', { email });
                return redirect(`/confirm-email?email=${encodeURIComponent(email)}`);
            }

            console.warn('[login] signInWithPassword returned error', { email, error });
            return { error: LOGIN_INVALID_CREDENTIALS };
        }
    } catch (err) {
        console.error('[login] signInWithPassword threw an exception', { email, err });
        return { error: 'Error interno al iniciar sesión. Inténtalo más tarde.' };
    }

    const next = String(formData.get('next') ?? '').trim();
    const safePath = isSafeRedirectPath(next) ? next : '/browse';
    return redirect(safePath);
}
