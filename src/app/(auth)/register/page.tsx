'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Sparkles, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);
    const supabase = createClient();

    // Password validation rules
    const passwordValidation = useMemo(() => {
        const password = formData.password;
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
    }, [formData.password]);

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate password before submitting
        if (!isPasswordValid) {
            setError('Por favor, cumple con todos los requisitos de seguridad de la contraseña.');
            return;
        }

        if (!captchaToken) {
            setError('Por favor, completa el captcha para continuar.');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                    },
                    captchaToken,
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error('Supabase signup error:', error);
                setError(error.message || 'Error al crear la cuenta. Intenta con otro email.');
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
                return;
            }

            // Check if email confirmation is required
            if (data?.user && !data.session) {
                // Email confirmation required - redirect to confirmation page
                router.push(`/confirm-email?email=${encodeURIComponent(formData.email)}`);
                return;
            }

            // If we have a session, user is logged in
            router.push('/browse');
            router.refresh();
        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Ocurrió un error inesperado');
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="relative">
            {/* Back to home button */}
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Volver al inicio</span>
            </Link>

            {/* Register Card */}
            <div className="card-premium p-6 sm:p-8 border border-surface-light/50 backdrop-blur-xl bg-surface/95">
                {/* Logo */}
                <div className="flex justify-center mb-4">
                    <Link href="/" className="group">
                        <img
                            src="/logo-full.svg"
                            alt="FilmiFy Logo"
                            className="h-10 w-auto group-hover:scale-105 transition-transform duration-300"
                        />
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-5">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Únete a <span className="text-gradient-premium">FilmiFy</span>
                    </h1>
                    <p className="text-text-secondary">
                        Crea tu cuenta y comienza tu aventura cinematográfica
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-3 animate-fade-in-up">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Nombre Completo
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                autoComplete="name"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Tu nombre"
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Correo Electrónico
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                required
                                autoComplete="new-password"
                                className="w-full pl-12 pr-12 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Password Requirements Checklist */}
                        {(passwordFocused || formData.password.length > 0) && (
                            <div className="mt-3 p-3 bg-surface/50 border border-surface-light rounded-lg space-y-2 animate-fade-in-up">
                                <p className="text-xs font-semibold text-text-secondary mb-2">Requisitos de seguridad:</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.minLength ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.minLength ? 'text-green-500' : 'text-text-muted'}`}>
                                            Mínimo 8 caracteres
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasUppercase ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasUppercase ? 'text-green-500' : 'text-text-muted'}`}>
                                            Una mayúscula
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasLowercase ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasLowercase ? 'text-green-500' : 'text-text-muted'}`}>
                                            Una minúscula
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasNumber ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-500' : 'text-text-muted'}`}>
                                            Un número
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordValidation.hasSpecial ? (
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        )}
                                        <span className={`text-xs ${passwordValidation.hasSpecial ? 'text-green-500' : 'text-text-muted'}`}>
                                            Un carácter especial (!@#$...)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* hCaptcha */}
                    <div className="flex justify-center py-2">
                        <HCaptcha
                            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                            onVerify={(token) => setCaptchaToken(token)}
                            ref={captchaRef}
                            theme="dark"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-5"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creando cuenta...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Crear Cuenta
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-surface-light/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-surface text-text-muted">o</span>
                    </div>
                </div>

                {/* Sign up link */}
                <div className="text-center">
                    <p className="text-text-secondary text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <Link
                            href="/login"
                            className="text-primary hover:text-accent font-semibold transition-colors"
                        >
                            Inicia sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
