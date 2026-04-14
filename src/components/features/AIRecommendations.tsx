'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, Film, AlertCircle } from 'lucide-react';
import { assertMovieRecommendationPromptSafe } from '@/lib/ai-prompt-safety';
import { getMovieRecommendationsJSON, type MovieRecommendationPick } from '@/lib/ai';
import { searchMovies } from '@/lib/tmdb/client';
import MovieCard from '@/components/features/MovieCard';
import type { Movie } from '@/types/tmdb';

function pickMovieFromSearchResults(results: Movie[], year?: number): Movie | null {
    const safe = results.filter((m) => !m.adult);
    if (safe.length === 0) return null;
    if (year) {
        const y = String(year);
        const byYear = safe.filter((m) => m.release_date?.startsWith(y));
        if (byYear.length > 0) {
            return [...byYear].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
        }
    }
    return [...safe].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
}

async function resolveMoviePick(pick: MovieRecommendationPick): Promise<Movie | null> {
    const searchResult = await searchMovies(pick.tmdbQuery);
    return pickMovieFromSearchResults(searchResult.results, pick.year);
}

export default function AIRecommendations() {
    const [prompt, setPrompt] = useState('');
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAskAI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');
        setMovies([]);

        const localSafety = assertMovieRecommendationPromptSafe(prompt);
        if (!localSafety.ok) {
            setError(localSafety.message);
            setLoading(false);
            return;
        }

        try {
            const ai = await getMovieRecommendationsJSON(prompt);

            if (!ai.ok) {
                setError(ai.error);
                return;
            }

            const moviePromises = ai.items.map((pick) => resolveMoviePick(pick));
            const results = await Promise.all(moviePromises);
            const seen = new Set<number>();
            const validMovies = results.filter((m): m is Movie => {
                if (!m || seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
            });

            if (validMovies.length === 0) {
                setError(
                    'La IA sugirió títulos pero no logramos enlazarlos con TMDB. Prueba otra formulación o nombres de películas más conocidos.'
                );
            } else {
                setMovies(validMovies);
            }

        } catch (err) {
            console.error(err);
            setError('Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-12 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-surface-light/30 to-surface/30 backdrop-blur-xl p-8">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />

            <div className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-full md:w-1/3 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-3 h-3" />
                            FilmiFy AI
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            ¿No sabes qué ver?
                        </h2>
                        <p className="text-text-secondary text-sm leading-relaxed">
                            Describe tu estado de ánimo, género favorito o una trama específica, y deja que la IA te muestre las mejores opciones.
                        </p>
                    </div>

                    <div className="w-full md:w-2/3">
                        <form onSubmit={handleAskAI} className="relative group">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ej: Películas de viajes en el tiempo con finales tristes..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={loading || !prompt}
                                className="absolute right-2 top-2 p-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Grid */}
                {movies.length > 0 && (
                    <div className="animate-fade-in-up">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Film className="w-5 h-5 text-primary" />
                            Recomendaciones para ti
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {movies.map((movie, index) => (
                                <div
                                    key={movie.id}
                                    className="animate-fade-in-up"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <MovieCard movie={movie} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
