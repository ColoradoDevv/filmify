'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/admin-settings';
import { getOptionalApiKeys } from '@/lib/env';

export type RegisterState = {
    error: string;
    fieldErrors?: Partial<Record<'email' | 'password' | 'username' | 'terms' | 'captcha', string>>;
    needsEmailConfirmation?: boolean;
    email?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Authoritative server-side blacklist. The client has its own copy for UX
// but the server is the source of truth.
const USERNAME_BLACKLIST = new Set([
    // Roles / system
    'admin', 'administrator', 'root', 'sysadmin', 'system', 'support', 'help',
    'mod', 'moderator', 'staff', 'official', 'filmify', 'owner', 'ceo',
    'webmaster', 'dev', 'developer', 'api', 'null', 'undefined',
    // Offensive (ES)
    'puto', 'puta', 'mierda', 'cabron', 'pendejo', 'verga', 'pito', 'culo',
    'coño', 'mamaguevo', 'zorra', 'perra', 'maricon', 'marica', 'idiota',
    'estupido', 'imbecil', 'bastardo', 'polla', 'semen', 'tetas', 'vagina',
    'concha', 'chupala', 'gonorrea', 'malparido', 'carechimba', 'pajero', 'pajera',
    // Offensive (EN)
    'dick', 'ass', 'bitch', 'fuck', 'shit', 'bastard', 'cunt', 'whore', 'slut',
    'nigger', 'nigga', 'faggot', 'rape', 'sex', 'porn', 'cock', 'pussy', 'tit',
    'boob', 'anus', 'anal', 'penis', 'nazi', 'hitler', 'kkk',
]);

function containsBlacklisted(username: string): boolean {
    const lower = username.toLowerCase();
    for (const word of USERNAME_BLACKLIST) {
        if (lower.includes(word)) return true;
    }
    return false;
}

function validatePassword(password: string): string | null {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Debe contener al menos un carácter especial';
    return null;
}

async function isRegistrationAllowed(): Promise<boolean> {
    try {
        const settings = await getSettings();
        return settings.allowRegistration !== false;
    } catch (err) {
        console.warn('[register] Could not fetch settings, defaulting to allowed:', err);
        return true;
    }
}

export async function registerAction(
    _prevState: RegisterState,
    formData: FormData
): Promise<RegisterState> {
    // Kill-switch: admin can disable registrations globally.
    if (!(await isRegistrationAllowed())) {
        return { error: 'El registro está temporalmente deshabilitado.' };
    }

    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    const username = String(formData.get('username') ?? '').trim();
    const fullName = String(formData.get('name') ?? '').trim();
    const captchaToken = String(formData.get('captchaToken') ?? '');
    const acceptedTerms = formData.get('acceptedTerms') === 'true';
    const hcaptchaEnabled = Boolean(getOptionalApiKeys().hcaptchaSiteKey);

    const fieldErrors: RegisterState['fieldErrors'] = {};

    // --- Field validation (server side, authoritative) ---
    if (!email || !EMAIL_RE.test(email)) {
        fieldErrors.email = 'Email inválido';
    }

    if (!USERNAME_RE.test(username)) {
        fieldErrors.username = 'Nickname debe tener 3-20 caracteres (letras, números, _)';
    } else if (containsBlacklisted(username)) {
        fieldErrors.username = 'Este nickname no está permitido';
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        fieldErrors.password = passwordError;
    }

    if (!acceptedTerms) {
        fieldErrors.terms = 'Debes aceptar los Términos y Condiciones';
    }

    if (hcaptchaEnabled && !captchaToken) {
        fieldErrors.captcha = 'Por favor completa el captcha';
    }

    if (Object.keys(fieldErrors).length > 0) {
        return {
            error: 'Por favor corrige los errores del formulario',
            fieldErrors,
        };
    }

    // --- Username uniqueness check (admin client bypasses RLS) ---
    let supabaseAdmin;
    try {
        supabaseAdmin = createAdminClient();
    } catch (err) {
        console.error('[register] Admin client unavailable:', err);
        return { error: 'El servicio de registro no está disponible en este momento.' };
    }

    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

    if (existingProfile) {
        return {
            error: 'Este nickname ya está en uso',
            fieldErrors: { username: 'Este nickname ya está en uso' },
        };
    }

    // --- Build the redirect URL for the confirmation email ---
    // We prefer NEXT_PUBLIC_APP_URL but fall back to the request origin so
    // this works in preview / local environments without extra config.
    const { appUrl } = getOptionalApiKeys();
    let origin = appUrl;
    if (!origin || origin === 'http://localhost:3000') {
        const hdrs = await headers();
        const host = hdrs.get('host');
        const proto = hdrs.get('x-forwarded-proto') ?? 'http';
        if (host) origin = `${proto}://${host}`;
    }

    // --- Sign up via the cookie-backed server client (so session cookies
    //     get set if email confirmation is disabled in the project). ---
    const supabase = await createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
                full_name: fullName || username,
                username,
            },
            ...(hcaptchaEnabled && captchaToken ? { captchaToken } : {}),
        },
    });

    if (signUpError) {
        const msg = signUpError.message?.toLowerCase() ?? '';
        if (msg.includes('already') || msg.includes('registered')) {
            return {
                error: 'Este email ya está registrado',
                fieldErrors: { email: 'Este email ya está registrado' },
            };
        }
        if (msg.includes('captcha')) {
            return {
                error: 'Verificación de captcha fallida. Intenta de nuevo.',
                fieldErrors: { captcha: 'Captcha inválido' },
            };
        }
        console.error('[register] signUp error:', signUpError);
        return { error: signUpError.message || 'No se pudo crear la cuenta' };
    }

    // Supabase returns action="user_repeated_signup" (200 OK, no error) when
    // the email already exists. In that case signUpData.user holds the
    // existing user — we must NOT treat this as a new registration.
    // Detect it by checking whether the user was just created (within the
    // last 10 seconds) vs an older account.
    const newUser = signUpData.user;
    if (!newUser) {
        console.error('[register] signUp returned no user and no error');
        return { error: 'No se pudo crear la cuenta. Intenta de nuevo.' };
    }

    const createdAt = newUser.created_at ? new Date(newUser.created_at).getTime() : 0;
    const isNewAccount = Date.now() - createdAt < 10_000; // created within last 10s

    if (!isNewAccount) {
        // Existing account — surface the error instead of silently succeeding.
        return {
            error: 'Este email ya está registrado',
            fieldErrors: { email: 'Este email ya está registrado' },
        };
    }

    const newUserId = newUser.id;

    // --- Explicit profile creation as a safety net. The DB trigger
    //     handle_new_user() should have already created the profile row,
    //     but we upsert here in case the trigger failed or was absent.
    //     Uses the admin client so RLS is bypassed. ---
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(
            {
                id: newUserId,
                username,
                full_name: fullName || username,
                // SEC-026: do NOT store email in the public profiles table.
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
        );

    if (profileError) {
        // Profile creation failed — this is a hard error. The user exists in
        // auth.users but without a profile the app will break on first login.
        // Roll back by deleting the auth user so they can retry cleanly.
        console.error('[register] Profile creation failed, rolling back auth user:', profileError);
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return {
            error: 'No se pudo completar el registro. Por favor intenta de nuevo.',
        };
    }

    // If the response has no session, Supabase is requiring email
    // confirmation. Surface that to the caller so it routes to the
    // confirm-email page instead of /browse (which would just bounce
    // them back to /login).
    if (!signUpData.session) {
        return {
            error: '',
            needsEmailConfirmation: true,
            email,
        };
    }

    // Session was issued — user is fully signed in.
    redirect('/browse');
}
