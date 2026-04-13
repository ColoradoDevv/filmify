'use server';

import { createClient } from '@/lib/supabase/server';

export type ResetPasswordState = {
    error: string;
    success?: boolean;
};

function validatePassword(password: string): string | null {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Debe contener al menos un carácter especial';
    return null;
}

export async function resetPasswordAction(
    _prevState: ResetPasswordState,
    formData: FormData
): Promise<ResetPasswordState> {
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    const validationError = validatePassword(password);
    if (validationError) {
        return { error: validationError };
    }

    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden' };
    }

    // The user reaches this action AFTER landing on /reset-password from the
    // email link, which means /auth/callback has already exchanged the
    // recovery code and set a session cookie. updateUser uses that cookie.
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            error: 'Tu sesión de recuperación expiró. Solicita un nuevo enlace.',
        };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        console.error('[reset-password] updateUser error:', error);
        if (error.message?.toLowerCase().includes('same as')) {
            return { error: 'La nueva contraseña debe ser diferente a la actual' };
        }
        return { error: 'No se pudo actualizar la contraseña. Intenta de nuevo.' };
    }

    return { error: '', success: true };
}
