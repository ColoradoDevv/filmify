import { getMovieDetails, getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import { getProviderLink } from '@/lib/referrals';
import MovieHero from '@/components/features/MovieHero';
import ReviewsSection from '@/components/features/ReviewsSection';
import Image from 'next/image';
import { Play, Star, Clock, Calendar, Globe, Heart, Share2, ChevronLeft, Facebook, Instagram, Twitter, Tag, Users, Film, Clapperboard } from 'lucide-react';
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

    try {
        const movie = await getMovieDetails(movieId);

        if (!movie) {
            return {
                title: 'Movie Not Found - FilmiFy',
            };
        }

        return {
            title: `${movie.title} - FilmiFy`,
            description: movie.overview,
        };
    } catch (error) {
        return {
            title: 'Movie Not Found - FilmiFy',
        };
    }
}

export default async function MovieDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) notFound();

    let movie;
    try {
        movie = await getMovieDetails(movieId);
        if (!movie) notFound();
    } catch (error) {
        // If TMDB API returns 404 or any error, show our custom 404 page
        console.error('Error fetching movie details:', error);
        notFound();
    }

    const backdropUrl = getBackdropUrl(movie.backdrop_path);
    const posterUrl = getPosterUrl(movie.poster_path);

    // Format runtime
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    const runtime = `${hours}h ${minutes}m`;

    // Get trailer
    let trailer = movie.videos?.results.find(
        (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    // AI Fallback for trailer
    if (!trailer) {
        const aiTrailerId = await getYouTubeTrailerId(
            movie.title,
            movie.release_date ? new Date(movie.release_date).getFullYear().toString() : '',
            'movie'
        );

        if (aiTrailerId) {
            trailer = {
                id: 'ai-generated',
                key: aiTrailerId,
                name: 'Official Trailer (AI Found)',
                site: 'YouTube',
                size: 1080,
                type: 'Trailer',
                official: false,
                published_at: new Date().toISOString()
            };
        }
    }

    // Get director
    const director = movie.credits?.crew.find((person) => person.job === 'Director');

    // Get top cast (limit to 10)
    const cast = movie.credits?.cast.slice(0, 10) || [];

    // Get watch providers for MX (default) or generic
    const providers = movie['watch/providers']?.results?.MX ||
        movie['watch/providers']?.results?.US ||
        Object.values(movie['watch/providers']?.results || {})[0];

    // Get writers
    const writers = movie.credits?.crew.filter((person) => ['Screenplay', 'Writer', 'Story'].includes(person.job)) || [];
    // Deduplicate writers
    const uniqueWriters = Array.from(new Set(writers.map(a => a.id)))
        .map(id => {
            return writers.find(a => a.id === id);
        });

    // Get certification (MX or US)
    const releaseDates = movie.release_dates?.results.find(r => r.iso_3166_1 === 'MX') ||
        movie.release_dates?.results.find(r => r.iso_3166_1 === 'US');
    const certification = releaseDates?.release_dates.find(r => r.certification)?.certification || 'NR';

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <MovieHero movie={movie} trailer={trailer} />

            <div className="container mx-auto px-4 py-12 space-y-16">

                {/* Tagline */}
                {movie.tagline && (
                    <div className="text-center max-w-4xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-light italic text-gray-300">
                            "{movie.tagline}"
                        </h2>
                    </div>
                )}

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
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
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
                    {/* Details Sidebar */}
                    <div className="space-y-8">
                        {/* Key Specs */}
                        <div className="bg-surface-light/10 rounded-xl p-6 border border-white/5 space-y-4">
                            <h3 className="text-xl font-bold text-white mb-4">Información</h3>

                            {director && (
                                <div>
                                    <span className="block text-gray-400 text-sm mb-1">Director</span>
                                    <span className="text-white font-medium">{director.name}</span>
                                </div>
                            )}

                            <div>
                                <span className="block text-gray-400 text-sm mb-1">Estado</span>
                                <span className="text-white font-medium">{movie.status}</span>
                            </div>

                            <div>
                                <span className="block text-gray-400 text-sm mb-1">Clasificación</span>
                                <span className="inline-block px-2 py-1 rounded bg-white/10 text-white text-xs font-bold border border-white/10">
                                    {certification}
                                </span>
                            </div>

                            <div>
                                <span className="block text-gray-400 text-sm mb-1">Título Original</span>
                                <span className="text-white font-medium italic">{movie.original_title}</span>
                            </div>

                            <div>
                                <span className="block text-gray-400 text-sm mb-1">Idioma Original</span>
                                <span className="text-white font-medium uppercase">{movie.original_language}</span>
                            </div>

                            {movie.budget > 0 && (
                                <div>
                                    <span className="block text-gray-400 text-sm mb-1">Presupuesto</span>
                                    <span className="text-white font-medium">{formatCurrency(movie.budget)}</span>
                                </div>
                            )}

                            {movie.revenue > 0 && (
                                <div>
                                    <span className="block text-gray-400 text-sm mb-1">Ingresos</span>
                                    <span className="text-white font-medium">{formatCurrency(movie.revenue)}</span>
                                </div>
                            )}
                        </div>

                        {/* External Links & Socials */}
                        <div className="flex flex-col gap-3">
                            {movie.homepage && (
                                <a
                                    href={movie.homepage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
                                >
                                    <Globe className="w-4 h-4" />
                                    Sitio Web Oficial
                                </a>
                            )}
                            <div className="grid grid-cols-4 gap-2">
                                {movie.external_ids?.imdb_id && (
                                    <a
                                        href={`https://www.imdb.com/title/${movie.external_ids.imdb_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center py-3 rounded-lg bg-[#f5c518]/10 hover:bg-[#f5c518]/20 text-[#f5c518] transition-colors border border-[#f5c518]/20"
                                        title="IMDb"
                                    >
                                        <span className="font-bold">IMDb</span>
                                    </a>
                                )}
                                {movie.external_ids?.facebook_id && (
                                    <a
                                        href={`https://facebook.com/${movie.external_ids.facebook_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center py-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-colors border border-[#1877F2]/20"
                                        title="Facebook"
                                    >
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                )}
                                {movie.external_ids?.instagram_id && (
                                    <a
                                        href={`https://instagram.com/${movie.external_ids.instagram_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center py-3 rounded-lg bg-[#E4405F]/10 hover:bg-[#E4405F]/20 text-[#E4405F] transition-colors border border-[#E4405F]/20"
                                        title="Instagram"
                                    >
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                )}
                                {movie.external_ids?.twitter_id && (
                                    <a
                                        href={`https://twitter.com/${movie.external_ids.twitter_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center py-3 rounded-lg bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] transition-colors border border-[#1DA1F2]/20"
                                        title="Twitter"
                                    >
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="md:col-span-2 space-y-10">
                        {/* Where to Watch */}
                        <div className="bg-surface-light/5 rounded-xl p-6 border border-white/5">
                            <h2 className="text-2xl font-bold text-white mb-6">Dónde Ver</h2>
                            {providers ? (
                                <div className="space-y-6">
                                    {providers.flatrate && (
                                        <div>
                                            <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-semibold">Streaming</h3>
                                            <div className="flex flex-wrap gap-4">
                                                {providers.flatrate.map((provider) => (
                                                    <a
                                                        key={provider.provider_id}
                                                        href={getProviderLink(provider.provider_name, movie.title)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group relative w-14 h-14 rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-110"
                                                        title={`Ver en ${provider.provider_name}`}
                                                    >
                                                        <Image
                                                            src={getPosterUrl(provider.logo_path) || ''}
                                                            alt={provider.provider_name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {providers.rent && (
                                        <div>
                                            <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-semibold">Alquilar</h3>
                                            <div className="flex flex-wrap gap-4">
                                                {providers.rent.map((provider) => (
                                                    <a
                                                        key={provider.provider_id}
                                                        href={getProviderLink(provider.provider_name, movie.title)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group relative w-14 h-14 rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-110"
                                                        title={`Alquilar en ${provider.provider_name}`}
                                                    >
                                                        <Image
                                                            src={getPosterUrl(provider.logo_path) || ''}
                                                            alt={provider.provider_name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {providers.buy && (
                                        <div>
                                            <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-semibold">Comprar</h3>
                                            <div className="flex flex-wrap gap-4">
                                                {providers.buy.map((provider) => (
                                                    <a
                                                        key={provider.provider_id}
                                                        href={getProviderLink(provider.provider_name, movie.title)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group relative w-14 h-14 rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-110"
                                                        title={`Comprar en ${provider.provider_name}`}
                                                    >
                                                        <Image
                                                            src={getPosterUrl(provider.logo_path) || ''}
                                                            alt={provider.provider_name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                        />
                                                    </a>
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

                        {/* Production Companies */}
                        {movie.production_companies && movie.production_companies.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6">Producción</h2>
                                <div className="flex flex-wrap gap-8 items-center bg-white/5 p-8 rounded-xl border border-white/5">
                                    {movie.production_companies.map((company) => (
                                        company.logo_path ? (
                                            <div key={company.id} className="relative h-12 w-auto min-w-[100px] opacity-70 hover:opacity-100 transition-opacity">
                                                <Image
                                                    src={getPosterUrl(company.logo_path) || ''}
                                                    alt={company.name}
                                                    width={200}
                                                    height={100}
                                                    className="object-contain h-full w-auto filter brightness-0 invert"
                                                    style={{ maxHeight: '48px', width: 'auto' }}
                                                />
                                            </div>
                                        ) : (
                                            <span key={company.id} className="text-gray-400 font-medium text-lg">
                                                {company.name}
                                            </span>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Collection Info */}
                        {movie.belongs_to_collection && (
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                                <div className="absolute inset-0">
                                    {movie.belongs_to_collection.backdrop_path && (
                                        <Image
                                            src={getBackdropUrl(movie.belongs_to_collection.backdrop_path) || ''}
                                            alt={movie.belongs_to_collection.name}
                                            fill
                                            className="object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-700"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                                </div>
                                <div className="relative p-8 md:p-12">
                                    <h3 className="text-sm text-primary font-bold uppercase tracking-wider mb-2">Colección</h3>
                                    <h2 className="text-3xl font-bold text-white mb-4">{movie.belongs_to_collection.name}</h2>
                                    <button className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors">
                                        Ver Colección
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Keywords */}
                        {movie.keywords?.keywords && movie.keywords.keywords.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-primary" />
                                    Palabras Clave
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {movie.keywords.keywords.map((keyword) => (
                                        <Link
                                            key={keyword.id}
                                            href={`/search?q=${keyword.name}`}
                                            className="px-3 py-1.5 rounded-lg bg-surface-light/30 border border-white/5 text-sm text-gray-300 hover:text-white hover:bg-surface-light hover:border-primary/30 transition-all"
                                        >
                                            {keyword.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {movie.recommendations?.results && movie.recommendations.results.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Film className="w-5 h-5 text-primary" />
                                    Recomendaciones
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {movie.recommendations.results.slice(0, 4).map((rec) => (
                                        <Link
                                            key={rec.id}
                                            href={`/movie/${rec.id}`}
                                            className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-light/30 border border-white/5 hover:border-primary/50 transition-all"
                                        >
                                            {rec.poster_path ? (
                                                <Image
                                                    src={getPosterUrl(rec.poster_path) || ''}
                                                    alt={rec.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                    Sin Imagen
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                                <p className="text-white font-bold text-sm line-clamp-2">{rec.title}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Reviews Section */}
                <ReviewsSection mediaId={movieId} mediaType="movie" />
            </div >
        </div >
    );
}
