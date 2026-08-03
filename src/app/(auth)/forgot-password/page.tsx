'use client';

import { useState, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import {
    forgotPasswordAction,
    verifyRecoveryCodeAction,
    type ForgotPasswordState,
    type VerifyRecoveryCodeState,
} from './actions';

const initialState: ForgotPasswordState = { error: '' };
const initialVerifyState: VerifyRecoveryCodeState = { error: '' };

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);
    const [verifyState, verifyFormAction, isVerifying] = useActionState(
        verifyRecoveryCodeAction,
        initialVerifyState
    );
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');

    // Código verificado → Supabase emitió sesión de recuperación; el formulario
    // de nueva contraseña vive en /reset-password.
    useEffect(() => {
        if (verifyState?.success) {
            router.push('/reset-password');
        }
    }, [verifyState?.success, router]);

    const showCodeStep = Boolean(state?.success);

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
                        {showCodeStep
                            ? 'Introduce el código que te enviamos por correo.'
                            : 'Ingresa tu email y te enviaremos un código para restablecerla.'}
                    </p>
                </div>

                {showCodeStep ? (
                    <>
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-4 rounded-xl mb-4 flex items-start gap-3 animate-fade-in-up">
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold mb-1">Email enviado</p>
                                <p className="text-green-400/80">
                                    Si existe una cuenta asociada a <span className="font-semibold">{email}</span>,
                                    recibirás un correo con un código de recuperación. Revisa también la carpeta de spam.
                                </p>
                            </div>
                        </div>

                        {verifyState?.error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-3 animate-fade-in-up">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium">{verifyState.error}</span>
                            </div>
                        )}

                        <form action={verifyFormAction} className="space-y-4">
                            <input type="hidden" name="email" value={email} />
                            <div>
                                <label htmlFor="code" className="block text-sm font-semibold mb-1.5 text-text-primary">
                                    Código de recuperación
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                                    <input
                                        type="text"
                                        id="code"
                                        name="code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        required
                                        autoFocus
                                        className="w-full pl-12 pr-4 py-3 bg-surface border border-surface-light rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-[0.3em] font-semibold"
                                        placeholder="00000000"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-text-muted">
                                    Si el correo incluye un botón o enlace, también puedes usarlo directamente.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isVerifying || code.length < 6}
                                className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-5"
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    'Verificar código'
                                )}
                            </button>
                        </form>

                        <form action={formAction} className="text-center mt-4">
                            <input type="hidden" name="email" value={email} />
                            <button
                                type="submit"
                                disabled={isPending}
                                className="text-sm text-primary hover:text-accent font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                ¿No llegó el código? Reenviar
                            </button>
                        </form>
                    </>
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
                                    'Enviar código de recuperación'
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
