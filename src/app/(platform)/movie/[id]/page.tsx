import { getMovieDetails, getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import MovieHero from '@/components/features/MovieHero';
import Image from 'next/image';
import { Play, Star, Clock, Calendar, Globe, Heart, Share2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const movieId = parseInt(id);
    const movie = await getMovieDetails(movieId);

    if (!movie) {
        return {
            title: 'Movie Not Found',
        };
    }

    return {
        title: `${movie.title} - FilmiFy`,
        description: movie.overview,
    };
}

export default async function MovieDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) notFound();

    const movie = await getMovieDetails(movieId);
    if (!movie) notFound();

    const backdropUrl = getBackdropUrl(movie.backdrop_path);
    const posterUrl = getPosterUrl(movie.poster_path);

    // Format runtime
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    const runtime = `${hours}h ${minutes}m`;

    // Get trailer
    const trailer = movie.videos?.results.find(
        (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    // Get director
    const director = movie.credits?.crew.find((person) => person.job === 'Director');

    // Get top cast (limit to 10)
    const cast = movie.credits?.cast.slice(0, 10) || [];

    // Get watch providers for MX (default) or generic
    const providers = movie['watch/providers']?.results?.MX ||
        movie['watch/providers']?.results?.US ||
        Object.values(movie['watch/providers']?.results || {})[0];

    return (
        <div className="min-h-screen bg-background pb-20">
            <MovieHero movie={movie} trailer={trailer} />

            <div className="container mx-auto px-4 py-12 space-y-16">
                {/* Cast Section */}
                {cast.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            Reparto Principal
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {cast.map((person) => (
                                <div key={person.id} className="group relative bg-surface-light/30 rounded-xl overflow-hidden border border-white/5 hover:border-primary/50 transition-colors">
                                    <div className="aspect-[2/3] relative">
                                        {person.profile_path ? (
                                            <Image
                                                src={getProfileUrl(person.profile_path) || ''}
                                                alt={person.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-surface-light flex items-center justify-center text-gray-500">
                                                Sin Imagen
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-white text-sm line-clamp-1">{person.name}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-1">{person.character}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Info Grid */}
                <section className="grid md:grid-cols-3 gap-8">
                    {/* Details */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Detalles</h2>
                        <div className="space-y-4 text-sm">
                            {director && (
                                <div>
                                    <span className="block text-gray-400 mb-1">Director</span>
                                    <span className="text-white font-medium">{director.name}</span>
                                </div>
                            )}
                            <div>
                                <span className="block text-gray-400 mb-1">Estado</span>
                                <span className="text-white font-medium">{movie.status}</span>
                            </div>
                            {movie.budget > 0 && (
                                <div>
                                    <span className="block text-gray-400 mb-1">Presupuesto</span>
                                    <span className="text-white font-medium">
                                        ${movie.budget.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {movie.revenue > 0 && (
                                <div>
                                    <span className="block text-gray-400 mb-1">Ingresos</span>
                                    <span className="text-white font-medium">
                                        ${movie.revenue.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Where to Watch */}
                    <div className="md:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Dónde Ver</h2>
                        {providers ? (
                            <div className="space-y-6">
                                {providers.flatrate && (
                                    <div>
                                        <h3 className="text-sm text-gray-400 mb-3">Streaming</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {providers.flatrate.map((provider) => (
                                                <div key={provider.provider_id} className="relative w-12 h-12 rounded-lg overflow-hidden tooltip" title={provider.provider_name}>
                                                    <Image
                                                        src={getPosterUrl(provider.logo_path) || ''}
                                                        alt={provider.provider_name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {providers.rent && (
                                    <div>
                                        <h3 className="text-sm text-gray-400 mb-3">Alquilar</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {providers.rent.map((provider) => (
                                                <div key={provider.provider_id} className="relative w-12 h-12 rounded-lg overflow-hidden" title={provider.provider_name}>
                                                    <Image
                                                        src={getPosterUrl(provider.logo_path) || ''}
                                                        alt={provider.provider_name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {providers.buy && (
                                    <div>
                                        <h3 className="text-sm text-gray-400 mb-3">Comprar</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {providers.buy.map((provider) => (
                                                <div key={provider.provider_id} className="relative w-12 h-12 rounded-lg overflow-hidden" title={provider.provider_name}>
                                                    <Image
                                                        src={getPosterUrl(provider.logo_path) || ''}
                                                        alt={provider.provider_name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {!providers.flatrate && !providers.rent && !providers.buy && (
                                    <p className="text-gray-400">No hay información de streaming disponible para esta región.</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-400">No hay información de streaming disponible.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
