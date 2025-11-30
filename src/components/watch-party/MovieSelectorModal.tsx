'use client';

import { useState } from 'react';
import { X, Search, Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { searchMovies, getPosterUrl } from '@/lib/tmdb/service';
import { getMovieRecommendationsJSON } from '@/lib/ai';
import { Movie } from '@/types/tmdb';

interface MovieSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (movie: Movie) => void;
}

export const MovieSelectorModal = ({ isOpen, onClose, onSelect }: MovieSelectorModalProps) => {
    const [activeTab, setActiveTab] = useState<'search' | 'ai'>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Movie[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        setResults([]);

        try {
            if (activeTab === 'search') {
                const response = await searchMovies(query);
                setResults(response.results);
            } else {
                // AI Search
                const titles = await getMovieRecommendationsJSON(query);
                const moviePromises = titles.map(title => searchMovies(title));
                const responses = await Promise.all(moviePromises);

                // Take the first result from each search that matches reasonably well
                const aiResults = responses
                    .map(r => r.results[0])
                    .filter(m => m !== undefined);

                setResults(aiResults);
            }
        } catch (err) {
            setError('Ocurrió un error al buscar películas.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                    <h2 className="text-xl font-bold text-white">Seleccionar Película</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 shrink-0">
                    <button
                        onClick={() => { setActiveTab('search'); setResults([]); setQuery(''); }}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'search'
                            ? 'bg-primary/10 text-primary border-b-2 border-primary'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Search size={18} />
                        Búsqueda
                    </button>
                    <button
                        onClick={() => { setActiveTab('ai'); setResults([]); setQuery(''); }}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'ai'
                            ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Sparkles size={18} />
                        FilmiFy AI
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 shrink-0">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={activeTab === 'search'
                                ? "Busca por título..."
                                : "Describe qué te gustaría ver (ej: 'Películas de terror en el espacio')..."}
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            autoFocus
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                            {activeTab === 'search' ? <Search size={20} /> : <Sparkles size={20} />}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Buscar'}
                        </button>
                    </form>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6 pt-0">
                    {error && (
                        <div className="text-center text-red-400 py-8">
                            {error}
                        </div>
                    )}

                    {results.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {results.map((movie) => (
                                <div
                                    key={movie.id}
                                    onClick={() => onSelect(movie)}
                                    className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/10"
                                >
                                    {movie.poster_path ? (
                                        <Image
                                            src={getPosterUrl(movie.poster_path) || ''}
                                            alt={movie.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                                            Sin Póster
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <h3 className="text-white font-bold text-sm line-clamp-2">{movie.title}</h3>
                                        <p className="text-gray-400 text-xs">{new Date(movie.release_date).getFullYear()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !isLoading && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 opacity-50">
                                <Search size={48} />
                                <p>Busca una película para comenzar</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
