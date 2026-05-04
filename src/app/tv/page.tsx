'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Tv, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';

const COOKIE_NAME = 'filmify_tv_mode';

function getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    return document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
}

export default function TVActivationPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'enabled' | 'disabled'>('idle');
    const [isActive, setIsActive] = useState(false);
    const enableBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setIsActive(getCookie(COOKIE_NAME) === '1');
        // Auto-focus the primary button for remote control
        enableBtnRef.current?.focus();
    }, []);

    const enableTV = async () => {
        setStatus('loading');
        await fetch('/api/tv-mode', { method: 'POST' });
        document.body.classList.add('tv-mode');
        setIsActive(true);
        setStatus('enabled');
        // Redirect to browse after 1.5s
        setTimeout(() => router.push('/browse'), 1500);
    };

    const disableTV = async () => {
        setStatus('loading');
        await fetch('/api/tv-mode', { method: 'DELETE' });
        // Remove tv-mode class immediately so cursor reappears
        document.body.classList.remove('tv-mode');
        document.body.style.cursor = '';
        setIsActive(false);
        setStatus('disabled');
        // Redirect to home after 1.5s
        setTimeout(() => router.push('/'), 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (e.target as HTMLElement).click();
        }
    };

    return (
        <div
            className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-white"
            onKeyDown={handleKeyDown}
        >
            {/* Logo */}
            <div className="mb-10">
                <img src="/logo-full.svg" alt="FilmiFy" className="h-12 w-auto" />
            </div>

            {/* Card */}
            <div className="w-full max-w-lg bg-surface-container border border-outline-variant rounded-3xl p-10 shadow-[var(--shadow-5)] text-center">

                {/* Icon */}
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 border border-primary/20 mx-auto mb-6">
                    <Tv className="w-10 h-10 text-primary" />
                </div>

                <h1 className="text-3xl font-bold mb-3">Modo TV</h1>
                <p className="text-white/50 text-base mb-8 leading-relaxed">
                    Activa el modo TV para una experiencia optimizada para control remoto con navegación por flechas y elementos más grandes.
                </p>

                {/* Status feedback */}
                {status === 'enabled' && (
                    <div className="flex items-center justify-center gap-3 mb-6 text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Modo TV activado — redirigiendo...</span>
                    </div>
                )}
                {status === 'disabled' && (
                    <div className="flex items-center justify-center gap-3 mb-6 text-white/50 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Modo TV desactivado — redirigiendo...</span>
                    </div>
                )}

                {/* Current state indicator */}
                <div className="flex items-center justify-center gap-2 mb-8 text-sm">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-white/20'}`} />
                    <span className="text-white/40">
                        {isActive ? 'Modo TV activo en este dispositivo' : 'Modo TV inactivo'}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4">
                    {!isActive ? (
                        <button
                            ref={enableBtnRef}
                            onClick={enableTV}
                            disabled={status === 'loading' || status === 'enabled'}
                            tabIndex={0}
                            data-focusable="true"
                            className="flex items-center justify-center gap-3 w-full px-8 py-5 bg-primary text-on-primary rounded-2xl font-bold text-xl hover:bg-primary-hover transition-all focus:outline-none focus:ring-4 focus:ring-primary/40 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Activar modo TV"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Tv className="w-6 h-6" />
                                    Activar Modo TV
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => router.push('/browse')}
                                tabIndex={0}
                                data-focusable="true"
                                className="flex items-center justify-center gap-3 w-full px-8 py-5 bg-primary text-on-primary rounded-2xl font-bold text-xl hover:bg-primary-hover transition-all focus:outline-none focus:ring-4 focus:ring-primary/40 focus:scale-105"
                                aria-label="Ir al inicio"
                            >
                                <ArrowRight className="w-6 h-6" />
                                Ir al Inicio
                            </button>
                            <button
                                onClick={disableTV}
                                disabled={status === 'loading' || status === 'disabled'}
                                tabIndex={0}
                                data-focusable="true"
                                className="flex items-center justify-center gap-3 w-full px-8 py-4 bg-white/5 text-white/50 border border-white/10 rounded-2xl font-medium text-base hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-30"
                                aria-label="Desactivar modo TV"
                            >
                                {status === 'loading' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Desactivar modo TV'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center text-white/30 text-sm max-w-sm">
                <p>Desde tu teléfono o computadora, visita</p>
                <p className="font-mono text-white/50 mt-1">filmify.me/tv</p>
                <p className="mt-2">para activar o desactivar el modo TV en este dispositivo.</p>
            </div>

            {/* Nav hint */}
            <div className="mt-6 flex items-center gap-4 text-white/20 text-xs">
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</kbd>
                    Navegar
                </span>
                <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">OK</kbd>
                    Seleccionar
                </span>
            </div>
        </div>
    );
}
