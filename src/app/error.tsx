'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to your monitoring service here (e.g. Sentry.captureException(error))
        console.error('[GlobalError]', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Algo salió mal</h2>
                <p className="text-text-secondary text-sm mb-8">
                    Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
                </p>

                {error.digest && (
                    <p className="text-xs text-slate-600 font-mono mb-6">
                        ID: {error.digest}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reintentar
                    </button>
                    <a
                        href="/"
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-surface hover:bg-surface-light border border-surface-light text-white rounded-xl font-medium transition-colors"
                    >
                        Ir al inicio
                    </a>
                </div>
            </div>
        </div>
    );
}
