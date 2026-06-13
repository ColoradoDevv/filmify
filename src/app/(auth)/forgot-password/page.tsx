'use client';

import { useState, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { forgotPasswordAction, type ForgotPasswordState } from './actions';

const initialState: ForgotPasswordState = { error: '' };

export default function ForgotPasswordPage() {
    const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);
    const [email, setEmail] = useState('');

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
                        ¿Olvidaste tu <span className="text-gradient-premium">contraseña</span>?
                    </h1>
                    <p className="text-text-secondary">
                        Ingresa tu email y te enviaremos un enlace para restablecerla.
                    </p>
                </div>

                {state?.success ? (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-4 rounded-xl mb-4 flex items-start gap-3 animate-fade-in-up">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Email enviado</p>
                            <p className="text-green-400/80">
                                Si existe una cuenta asociada a <span className="font-semibold">{email}</span>,
                                recibirás un correo con instrucciones para restablecer tu contraseña.
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
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold mb-1.5 text-text-primary">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isPending || !email}
                                className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-5"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar enlace de recuperación'
                                )}
                            </button>
                        </form>
                    </>
                )}

                <div className="text-center mt-6">
                    <p className="text-text-secondary text-sm">
                        ¿Recordaste tu contraseña?{' '}
                        <Link href="/login" className="text-primary hover:text-accent font-semibold transition-colors">
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
