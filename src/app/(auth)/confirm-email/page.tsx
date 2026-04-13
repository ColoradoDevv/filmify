'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { createClient } from '@/lib/supabase/client';
import { resendSignupConfirmation } from './actions';

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '';
const hcaptchaConfigured = Boolean(HCAPTCHA_SITE_KEY);

export default function ConfirmEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get('email')?.trim() ?? '';
    const [manualEmail, setManualEmail] = useState('');
    const [checking, setChecking] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendError, setResendError] = useState<string | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const captchaRef = useRef<HCaptcha>(null);
    const supabase = createClient();

    const effectiveEmail = (emailFromQuery || manualEmail.trim()).toLowerCase();

    useEffect(() => {
        if (!resendSuccess) return;
        const t = window.setTimeout(() => setResendSuccess(false), 8000);
        return () => window.clearTimeout(t);
    }, [resendSuccess]);

    useEffect(() => {
        if (!resendError) return;
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
    }, [resendError]);

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

    const handleResend = async () => {
        if (!effectiveEmail) {
            setResendError('Indica el correo con el que te registraste para reenviar el enlace.');
            return;
        }

        if (hcaptchaConfigured && !captchaToken) {
            setResendError('Completa la verificación “No soy un robot” antes de reenviar el correo.');
            return;
        }

        setResending(true);
        setResendError(null);
        setResendSuccess(false);
        setInfoMessage(null);

        try {
            const result = await resendSignupConfirmation({
                email: effectiveEmail,
                captchaToken: hcaptchaConfigured ? captchaToken : undefined,
            });

            if (result.error) {
                setResendError(result.error);
            } else if (result.status === 'already_confirmed') {
                setResendSuccess(false);
                setResendError(null);
                setInfoMessage('Este correo ya está confirmado. Puedes iniciar sesión con tu contraseña.');
            } else if (result.ok) {
                setResendSuccess(true);
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
            }
        } catch (err) {
            console.error('Unexpected resend error:', err);
            setResendError('Ocurrió un error inesperado al reenviar.');
        } finally {
            setResending(false);
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
                        Revisa tu correo electrónico{' '}
                        {effectiveEmail ? (
                            <span className="font-semibold text-text-primary block mt-1">{effectiveEmail}</span>
                        ) : (
                            <span className="block mt-1 text-sm">Si no ves la dirección abajo, escríbela para poder reenviar el enlace.</span>
                        )}
                    </p>

                    {!emailFromQuery && (
                        <div className="text-left mb-6">
                            <label htmlFor="resend-email" className="block text-sm font-semibold text-text-primary mb-1.5">
                                Correo de registro
                            </label>
                            <input
                                id="resend-email"
                                type="email"
                                autoComplete="email"
                                value={manualEmail}
                                onChange={(e) => {
                                    setManualEmail(e.target.value);
                                    setResendError(null);
                                }}
                                placeholder="tu@correo.com"
                                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-light text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    )}

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
                        <div className="flex flex-col items-center gap-2">
                            <p>¿No recibiste el correo?</p>
                            {hcaptchaConfigured && (
                                <div className="w-full flex justify-center py-3">
                                    <HCaptcha
                                        sitekey={HCAPTCHA_SITE_KEY}
                                        theme="dark"
                                        ref={captchaRef}
                                        onVerify={(token) => setCaptchaToken(token)}
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={
                                    resending ||
                                    !effectiveEmail ||
                                    (hcaptchaConfigured && !captchaToken)
                                }
                                className="text-primary hover:text-accent font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {resending ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Reenviando...
                                    </>
                                ) : (
                                    'Reenviar correo'
                                )}
                            </button>
                            {resendSuccess && (
                                <p className="text-green-500 text-xs font-medium max-w-sm text-center">
                                    Hemos procesado tu solicitud. Revisa la bandeja de entrada y la carpeta de spam en los
                                    próximos minutos. Si no recibes nada, el administrador del sitio debe revisar el envío de
                                    correos (SMTP en Supabase o proveedor propio como Resend).
                                </p>
                            )}
                            {resendError && (
                                <p className="text-red-400 text-xs mt-1">{resendError}</p>
                            )}
                            {infoMessage && (
                                <p className="text-sky-400 text-xs mt-2 max-w-sm text-center">
                                    {infoMessage}{' '}
                                    <Link href="/login" className="font-semibold underline hover:text-sky-300">
                                        Ir a iniciar sesión
                                    </Link>
                                </p>
                            )}
                        </div>
                        <p className="pt-4">
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
