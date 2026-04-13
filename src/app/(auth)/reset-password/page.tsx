'use client';

import { useState, useMemo, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { resetPasswordAction, type ResetPasswordState } from './actions';

const initialState: ResetPasswordState = { error: '' };

export default function ResetPasswordPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const passwordValidation = useMemo(() => ({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }), [password]);

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);
    const passwordsMatch = password.length > 0 && password === confirmPassword;

    // After a successful reset, send the user to login.
    useEffect(() => {
        if (state?.success) {
            const t = setTimeout(() => router.push('/login'), 2500);
            return () => clearTimeout(t);
        }
    }, [state?.success, router]);

    return (
        <div className="relative">
            <Link
                href="/login"
                className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Volver al inicio de sesión</span>
            </Link>

            <div className="card-premium p-6 sm:p-8 border border-surface-light/50 backdrop-blur-xl bg-surface/95">
                <div className="flex justify-center mb-4">
                    <Link href="/" className="group">
                        <img
                            src="/logo-full.svg"
                            alt="FilmiFy Logo"
                            className="h-10 w-auto group-hover:scale-105 transition-transform duration-300"
                        />
                    </Link>
                </div>

                <div className="text-center mb-5">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Nueva <span className="text-gradient-premium">contraseña</span>
                    </h1>
                    <p className="text-text-secondary">
                        Crea una nueva contraseña segura para tu cuenta.
                    </p>
                </div>

                {state?.success ? (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-4 rounded-xl mb-4 flex items-start gap-3 animate-fade-in-up">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Contraseña actualizada</p>
                            <p className="text-green-400/80">
                                Te redirigimos al inicio de sesión...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {state?.error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-3 animate-fade-in-up">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium">{state.error}</span>
                            </div>
                        )}

                        <form action={formAction} className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold mb-1.5 text-text-primary">
                                    Nueva contraseña
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {(passwordFocused || password.length > 0) && (
                                    <div className="mt-3 p-3 bg-surface/50 border border-surface-light rounded-lg space-y-2 animate-fade-in-up">
                                        <p className="text-xs font-semibold text-text-secondary mb-2">Requisitos:</p>
                                        <div className="space-y-1.5">
                                            {[
                                                { ok: passwordValidation.minLength, label: 'Mínimo 8 caracteres' },
                                                { ok: passwordValidation.hasUppercase, label: 'Una mayúscula' },
                                                { ok: passwordValidation.hasLowercase, label: 'Una minúscula' },
                                                { ok: passwordValidation.hasNumber, label: 'Un número' },
                                                { ok: passwordValidation.hasSpecial, label: 'Un carácter especial' },
                                            ].map(({ ok, label }) => (
                                                <div key={label} className="flex items-center gap-2">
                                                    {ok ? (
                                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                    ) : (
                                                        <X className="w-4 h-4 text-text-muted flex-shrink-0" />
                                                    )}
                                                    <span className={`text-xs ${ok ? 'text-green-500' : 'text-text-muted'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-1.5 text-text-primary">
                                    Confirmar contraseña
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        className={`w-full pl-12 pr-12 py-3 bg-surface border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${
                                            confirmPassword.length > 0 && !passwordsMatch
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                                : passwordsMatch
                                                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                                                    : 'border-surface-light focus:border-primary focus:ring-primary/20'
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && !passwordsMatch && (
                                    <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isPending || !isPasswordValid || !passwordsMatch}
                                className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-5"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Actualizando...
                                    </>
                                ) : (
                                    'Actualizar contraseña'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
