import { getTVDetails, getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import MovieHero from '@/components/features/MovieHero';
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
    const tvShow = await getTVDetails(tvId);

    if (!tvShow) {
        return {
            title: 'TV Show Not Found',
        };
    }

    return {
        title: `${tvShow.title || tvShow.name} - FilmiFy`,
        description: tvShow.overview,
    };
}

export default async function TVDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const tvId = parseInt(id);
    if (isNaN(tvId)) notFound();

    const tvShow = await getTVDetails(tvId);
    if (!tvShow) notFound();

    // Map TV show data to match Movie structure for MovieHero
    // TV shows have 'name' instead of 'title', but our MovieDetails type (reused for TV) might have gaps
    // We ensure the object passed to MovieHero has the expected properties
    const heroData = {
        ...tvShow,
        title: tvShow.name || tvShow.title, // Ensure title is present
        original_title: tvShow.original_name || tvShow.original_title,
        release_date: tvShow.first_air_date || tvShow.release_date,
    };

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

    // Get creator/showrunner (often in created_by for TV, but we'll check crew for now as per current type)
    // For TV shows, 'Director' might not be the main role, usually 'Executive Producer' or 'Creator'
    // We'll look for 'Executive Producer' or just take the first crew member for now if specific roles aren't found
    const creator = tvShow.credits?.crew.find((person) => person.job === 'Executive Producer' || person.job === 'Creator');

    // Get top cast (limit to 10)
    const cast = tvShow.credits?.cast.slice(0, 10) || [];

    // Get watch providers
    const providers = tvShow['watch/providers']?.results?.MX ||
        tvShow['watch/providers']?.results?.US ||
        Object.values(tvShow['watch/providers']?.results || {})[0];

    return (
        <div className="min-h-screen bg-background pb-20">
            <MovieHero movie={heroData} trailer={trailer} />

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
                            {/* TV shows usually don't have budget/revenue in the same way, or it's per episode */}
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
            </div>
        </div>
    );
}
