'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: any, formData: FormData) {
    const identifier = formData.get('email') as string; // Can be email or username
    const password = formData.get('password') as string;
    const captchaToken = formData.get('captchaToken') as string;

    if (!identifier || !password || !captchaToken) {
        return { error: 'Por favor completa todos los campos' };
    }

    let email = identifier;

    // Check if identifier is NOT an email (simple regex)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (!isEmail) {
        // Assume it's a username, resolve to email using Admin Client
        const supabaseAdmin = createAdminClient();

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('username', identifier)
            .single();

        if (profileError || !profile) {
            return { error: 'Credenciales inválidas' };
        }

        // Get user email by ID
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (userError || !user.user?.email) {
            return { error: 'Credenciales inválidas' };
        }

        email = user.user.email;
    }

    // Perform standard login with resolved email
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
            captchaToken,
        },
    });

    if (error) {
        // We removed the specific "Email not confirmed" check as requested.
        return { error: 'Credenciales inválidas' };
    }

    return redirect('/browse');
}
