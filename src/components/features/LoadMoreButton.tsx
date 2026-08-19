'use client';

import { Sparkles, Loader2, Plus, AlertCircle } from 'lucide-react';

interface LoadMoreButtonProps {
    onLoadMore: () => void;
    loading: boolean;
    hasMore: boolean;
    /** Si ya hay algo pintado: decide si mostrar el mensaje de fin de catálogo. */
    hasItems: boolean;
    /** Plural en minúscula para las etiquetas: "películas", "series", "anime"… */
    label: string;
    error?: string | null;
}

/**
 * Pie de las grillas de catálogo: "Cargar más" / fin de catálogo.
 *
 * Compartido por películas, series, anime y doramas para que los cuatro
 * módulos paginen con el mismo control y el mismo aspecto.
 */
export default function LoadMoreButton({
    onLoadMore,
    loading,
    hasMore,
    hasItems,
    label,
    error,
}: LoadMoreButtonProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLoadMore();
        }
    };

    return (
        <>
            {error && (
                <div className="flex items-center justify-center gap-2 text-error text-sm bg-error/5 rounded-lg p-3 mx-auto max-w-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="text-center pt-4">
                {hasMore ? (
                    <button
                        onClick={onLoadMore}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        className="group cursor-pointer relative w-full sm:w-auto px-8 py-4 bg-surface hover:bg-surface-hover border border-surface-light rounded-2xl font-medium transition-all sm:hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed tv-focusable tv-button-focus focus:outline-none text-white"
                        tabIndex={0}
                        data-focusable="true"
                        aria-label={`Cargar más ${label}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center gap-2 justify-center">
                            {loading ? (
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 text-primary" />
                            )}
                            {loading ? 'Cargando...' : `Cargar más ${label}`}
                        </span>
                    </button>
                ) : hasItems ? (
                    <p className="text-text-muted text-sm flex items-center justify-center gap-1">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Has llegado al final del catálogo
                    </p>
                ) : null}
            </div>
        </>
    );
}
