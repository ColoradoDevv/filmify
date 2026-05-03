'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Send, Loader2, Film, AlertCircle, RefreshCw } from 'lucide-react';
import { assertMovieRecommendationPromptSafe } from '@/lib/ai-prompt-safety';
import { getAIRecommendations, type MovieRecommendationPick } from '@/app/actions/ai';
import { searchMovies } from '@/lib/tmdb/client';
import MovieCard from '@/components/features/MovieCard';
import type { Movie } from '@/types/tmdb';

// ── Helpers ──────────────────────────────────────────────────────────────────

function pickBest(results: Movie[], year?: number): Movie | null {
    const safe = results.filter((m) => !m.adult);
    if (!safe.length) return null;
    if (year) {
        const byYear = safe.filter((m) => m.release_date?.startsWith(String(year)));
        if (byYear.length) return byYear.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
    }
    return safe.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
}

async function resolveMovie(pick: MovieRecommendationPick): Promise<Movie | null> {
    try {
        const res = await searchMovies(pick.tmdbQuery);
        return pickBest(res.results, pick.year);
    } catch {
        return null;
    }
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
    'Películas de ciencia ficción con giros inesperados',
    'Comedias románticas para ver en pareja',
    'Thrillers psicológicos perturbadores',
    'Animaciones para toda la familia',
    'Dramas históricos épicos',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIRecommendations() {
    const [prompt,   setPrompt]   = useState('');
    const [movies,   setMovies]   = useState<Movie[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    const [cooldown, setCooldown] = useState(0); // seconds remaining

    // Countdown timer for rate-limit cooldown
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const ask = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setLoading(true);
        setError('');
        setMovies([]);

        // Client-side safety check first (avoids a round-trip)
        const safety = assertMovieRecommendationPromptSafe(trimmed);
        if (!safety.ok) {
            setError(safety.message);
            setLoading(false);
            return;
        }

        try {
            const result = await getAIRecommendations(trimmed);

            if (!result.ok) {
                setError(result.error);
                // If rate limited, start a 15s cooldown
                if (result.error.includes('solicitudes') || result.error.includes('rate')) {
                    setCooldown(15);
                }
                return;
            }

            const resolved = await Promise.all(result.items.map(resolveMovie));
            const seen = new Set<number>();
            const valid = resolved.filter((m): m is Movie => {
                if (!m || seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
            });

            if (!valid.length) {
                setError('La IA sugirió títulos pero no los encontramos en TMDB. Prueba con otra descripción.');
            } else {
                setMovies(valid);
            }
        } catch {
            setError('Error inesperado. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        ask(prompt);
    };

    return (
        /* MD3 filled card */
        <div className="mb-8 rounded-[var(--radius-xl)] border border-primary/20 bg-surface-container overflow-hidden">
            <div className="p-5 sm:p-6">

                {/* Header */}
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-on-primary-container" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="md3-title-medium text-on-surface">FilmiFy AI</h2>
                            <span className="px-2 h-5 rounded-full bg-primary/15 md3-label-small text-primary flex items-center">Beta</span>
                        </div>
                        <p className="md3-body-small text-on-surface-variant">
                            Describe tu estado de ánimo, género o trama y la IA te recomienda películas.
                        </p>
                    </div>
                </div>

                {/* Search form */}
                <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ej: Películas de viajes en el tiempo con finales tristes…"
                        disabled={loading}
                        className={[
                            'flex-1 h-10 rounded-full px-4',
                            'bg-surface-container-high border border-outline-variant',
                            'md3-body-medium text-on-surface placeholder:text-on-surface-variant/50',
                            'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40',
                            'disabled:opacity-50 transition-colors',
                        ].join(' ')}
                    />
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim() || cooldown > 0}
                        aria-label="Buscar recomendaciones"
                        className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[var(--shadow-1)] transition-shadow shrink-0"
                    >
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : cooldown > 0
                                ? <span className="text-[11px] font-bold tabular-nums">{cooldown}s</span>
                                : <Send className="w-4 h-4" />
                        }
                    </button>
                </form>

                {/* Suggestion chips — only when idle */}
                {!loading && !movies.length && !error && (
                    <div className="flex flex-wrap gap-1.5">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => { setPrompt(s); ask(s); }}
                                className="h-7 px-3 rounded-full border border-outline-variant bg-surface-container-high md3-label-small text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-error-container/30 border border-error/20">
                        <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                        <p className="md3-body-small text-on-surface-variant flex-1">{error}</p>
                        <button
                            onClick={() => ask(prompt)}
                            className="shrink-0 w-7 h-7 rounded-full hover:bg-on-surface/8 flex items-center justify-center text-on-surface-variant transition-colors"
                            aria-label="Reintentar"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="px-5 sm:px-6 pb-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 rounded-full bg-primary/20 animate-pulse" />
                        <div className="h-3 w-32 rounded-full bg-on-surface/10 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="aspect-[2/3] rounded-[var(--radius-lg)] bg-surface-container-high animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {movies.length > 0 && !loading && (
                <div className="px-5 sm:px-6 pb-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-primary" />
                            <span className="md3-label-large text-on-surface">
                                {movies.length} recomendaciones
                            </span>
                        </div>
                        <button
                            onClick={() => { setMovies([]); setError(''); }}
                            className="md3-label-small text-on-surface-variant hover:text-on-surface underline-offset-2 hover:underline transition-colors"
                        >
                            Nueva búsqueda
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {movies.map((movie, i) => (
                            <div
                                key={movie.id}
                                className="animate-fade-in-up"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
