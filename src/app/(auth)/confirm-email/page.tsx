'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmEmailPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleCheckConfirmation = async () => {
        setChecking(true);
        setError(null);

        try {
            // Get the current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.error('Session error:', sessionError);
                setError('Error al verificar la confirmación. Intenta de nuevo.');
                setChecking(false);
                return;
            }

            if (session) {
                // User is confirmed and logged in
                router.push('/browse');
            } else {
                // User hasn't confirmed yet
                setError('Aún no has confirmado tu email. Por favor, revisa tu bandeja de entrada y haz clic en el enlace de confirmación.');
                setChecking(false);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Ocurrió un error inesperado. Intenta de nuevo.');
            setChecking(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="card-premium p-8 sm:p-10 border border-surface-light/50 backdrop-blur-xl bg-surface/95 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                            <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-full border border-primary/30">
                                <Mail className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Header */}
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                        ¡Cuenta <span className="text-gradient-premium">Creada</span>!
                    </h1>
                    <p className="text-text-secondary text-lg mb-8">
                        Revisa tu correo electrónico
                    </p>

                    {/* Instructions */}
                    <div className="bg-surface/50 border border-surface-light rounded-xl p-6 mb-8 text-left">
                        <div className="flex items-start gap-3 mb-4">
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-text-primary mb-1">
                                    Paso 1: Revisa tu bandeja de entrada
                                </p>
                                <p className="text-xs text-text-muted">
                                    Te hemos enviado un correo de confirmación
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 mb-4">
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-text-primary mb-1">
                                    Paso 2: Haz clic en el enlace
                                </p>
                                <p className="text-xs text-text-muted">
                                    Confirma tu dirección de correo electrónico
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-text-primary mb-1">
                                    Paso 3: Vuelve aquí
                                </p>
                                <p className="text-xs text-text-muted">
                                    Haz clic en el botón de abajo para continuar
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Confirmation Button */}
                    <button
                        onClick={handleCheckConfirmation}
                        disabled={checking}
                        className="w-full px-6 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold text-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mb-6"
                    >
                        {checking ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            <>
                                Ya confirmé mi cuenta
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-light/50" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-surface text-text-muted">o</span>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="text-sm text-text-muted space-y-2">
                        <p>
                            ¿No recibiste el correo?{' '}
                            <button className="text-primary hover:text-accent font-semibold transition-colors">
                                Reenviar
                            </button>
                        </p>
                        <p>
                            <Link
                                href="/login"
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                Volver al inicio de sesión
                            </Link>
                        </p>
                    </div>
                </div>

                {/* FilmiFy Logo */}
                <div className="flex justify-center mt-8">
                    <Link href="/">
                        <img
                            src="/logo-full.svg"
                            alt="FilmiFy"
                            className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity"
                        />
                    </Link>
                </div>
            </div>
        </div>
    );
}
