'use client';

import { useState, useRef, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { loginAction } from './actions';

const initialState = {
    error: '',
};

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '';
const hcaptchaConfigured = Boolean(HCAPTCHA_SITE_KEY);

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(loginAction, initialState);
    const [showPassword, setShowPassword] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Reset captcha when error occurs
    useEffect(() => {
        if (state?.error) {
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        }
    }, [state?.error]);

    const handleSubmit = (formData: FormData) => {
        if (hcaptchaConfigured) {
            if (!captchaToken) return;
            formData.set('captchaToken', captchaToken);
        }
        formAction(formData);
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

            {/* Login Card */}
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
                        Bienvenido de <span className="text-gradient-premium">vuelta</span>
                    </h1>
                    <p className="text-text-secondary">
                        Inicia sesión para continuar tu experiencia cinematográfica
                    </p>
                </div>

                {/* Error Message */}
                {state?.error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-3 animate-fade-in-up">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{state.error}</span>
                    </div>
                )}

                {/* Form */}
                <form action={handleSubmit} className="space-y-4" ref={formRef}>
                    {/* Email/Nickname Field */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-semibold mb-1.5 text-text-primary"
                        >
                            Correo o Nickname
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                id="email"
                                name="email"
                                required
                                autoComplete="username"
                                className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="tu@email.com o tu_nickname"
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
                                required
                                autoComplete="current-password"
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
                    </div>

                    {/* hCaptcha */}
                    {hcaptchaConfigured && (
                        <div className="flex justify-center py-2">
                            <HCaptcha
                                sitekey={HCAPTCHA_SITE_KEY}
                                onVerify={(token) => setCaptchaToken(token)}
                                ref={captchaRef}
                                theme="dark"
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-5"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Iniciando sesión...
                            </>
                        ) : (
                            'Iniciar Sesión'
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
                        ¿No tienes cuenta?{' '}
                        <Link
                            href="/register"
                            className="text-primary hover:text-accent font-semibold transition-colors"
                        >
                            Crear cuenta gratis
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
