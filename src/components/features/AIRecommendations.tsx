'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, Film, AlertCircle } from 'lucide-react';
import { getMovieRecommendationsJSON } from '@/lib/ai';
import { searchMovies } from '@/lib/tmdb/service';
import MovieCard from '@/components/features/MovieCard';
import type { Movie } from '@/types/tmdb';

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

        try {
            // 1. Get titles from AI
            const titles = await getMovieRecommendationsJSON(prompt);

            if (titles.length === 0) {
                setError('No pude encontrar recomendaciones para esa búsqueda. Intenta ser más específico.');
                return;
            }

            // 2. Fetch movie details from TMDB
            const moviePromises = titles.map(async (title) => {
                const searchResult = await searchMovies(title);
                // Return the first exact-ish match
                return searchResult.results[0] || null;
            });

            const results = await Promise.all(moviePromises);
            const validMovies = results.filter((m): m is Movie => m !== null);

            if (validMovies.length === 0) {
                setError('Encontré títulos pero no pude localizarlos en nuestra base de datos.');
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
