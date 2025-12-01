import type { MovieDetails, TVDetails } from '@/types/tmdb';
import { getTVDetails, getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import MovieHero from '@/components/features/MovieHero';
import ReviewsSection from '@/components/features/ReviewsSection';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const tvId = parseInt(id);

    try {
        const tvShow = await getTVDetails(tvId);

        if (!tvShow) {
            return {
                title: 'TV Show Not Found - FilmiFy',
            };
        }

        return {
            title: `${tvShow.name} - FilmiFy`,
            description: tvShow.overview,
        };
    } catch (error) {
        return {
            title: 'TV Show Not Found - FilmiFy',
        };
    }
}

export default async function TVDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const tvId = parseInt(id);
    if (isNaN(tvId)) notFound();

    let tvShow;
    try {
        tvShow = await getTVDetails(tvId);
        if (!tvShow) notFound();
    } catch (error) {
        // If TMDB API returns 404 or any error, show our custom 404 page
        console.error('Error fetching TV show details:', error);
        notFound();
    }

    // Map TV show data to match Movie structure for MovieHero
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { similar, recommendations, ...restTvShow } = tvShow;

    const heroData = {
        ...restTvShow,
        title: tvShow.name,
        original_title: tvShow.original_name,
        release_date: tvShow.first_air_date,
        runtime: 0,
        budget: 0,
        revenue: 0,
        imdb_id: tvShow.external_ids?.imdb_id || '',
        video: false,
    } as unknown as MovieDetails;

    // Get trailer
    let trailer = tvShow.videos?.results.find(
        (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    // AI Fallback for trailer
    if (!trailer) {
        const aiTrailerId = await getYouTubeTrailerId(
            tvShow.name,
            tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear().toString() : '',
            'tv'
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

    const creator = tvShow.credits?.crew.find((person) => person.job === 'Executive Producer' || person.job === 'Creator');
    const cast = tvShow.credits?.cast.slice(0, 10) || [];
    const providers = tvShow['watch/providers']?.results?.MX ||
        tvShow['watch/providers']?.results?.US ||
        Object.values(tvShow['watch/providers']?.results || {})[0];

    return (
        <div className="min-h-screen bg-background pb-20">
            <MovieHero movie={heroData} trailer={trailer} mediaType="tv" seasons={tvShow.seasons} />

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
                    {/* Details */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white mb-4">Detalles</h2>
                        <div className="space-y-4 text-sm">
                            {creator && (
                                <div>
                                    <span className="block text-gray-400 mb-1">Creador / EP</span>
                                    <span className="text-white font-medium">{creator.name}</span>
                                </div>
                            )}
                            <div>
                                <span className="block text-gray-400 mb-1">Estado</span>
                                <span className="text-white font-medium">{tvShow.status}</span>
                            </div>
                            {tvShow.number_of_seasons && (
                                <div>
                                    <span className="block text-gray-400 mb-1">Temporadas</span>
                                    <span className="text-white font-medium">
                                        {tvShow.number_of_seasons}
                                    </span>
                                </div>
                            )}
                            {tvShow.number_of_episodes && (
                                <div>
                                    <span className="block text-gray-400 mb-1">Episodios</span>
                                    <span className="text-white font-medium">
                                        {tvShow.number_of_episodes}
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
                                                        sizes="48px"
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
                                                        sizes="48px"
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
                                                        sizes="48px"
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

                {/* Reviews Section */}
                <ReviewsSection mediaId={tvId} mediaType="tv" />
            </div>
        </div>
    );
}
