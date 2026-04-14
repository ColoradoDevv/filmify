import type { MovieDetails, TVDetails } from '@/types/tmdb';
import { getTVDetails, getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import { getOptionalApiKeys } from '@/lib/env';
import MovieHero from '@/components/features/MovieHero';
import ReviewsSection from '@/components/features/ReviewsSection';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isTVDevice } from '@/lib/device-detection';
import TVDetailsPageTV from './page-tv';
import TVLayoutWrapper from '@/components/layout/TVLayoutWrapper';
import TVSidebar from '@/components/layout/TVSidebar';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function buildTvMetadata(tvShow: ReturnType<typeof getTVDetails>): Metadata {
    const title = `Dónde ver ${tvShow.name} online | FilmiFy`;
    const description = tvShow.overview
        ? `${tvShow.overview} Descubre dónde ver ${tvShow.name} online, con proveedores de streaming, temporada y reparto.`
        : `Encuentra dónde ver ${tvShow.name} online, con datos de streaming y capítulos disponibles en FilmiFy.`;
    const keywordSet = new Set<string>([
        tvShow.name,
        `ver ${tvShow.name}`,
        `dónde ver ${tvShow.name}`,
        'serie online',
        'ver serie',
        'streaming',
        'temporadas',
        'dónde ver serie',
    ]);

    tvShow.genres?.forEach((genre) => {
        if (genre.name) {
            keywordSet.add(genre.name);
            keywordSet.add(`series de ${genre.name}`);
        }
    });

    const keywords = Array.from(keywordSet).slice(0, 24);

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: getPosterUrl(tvShow.poster_path) || '/logo-icon.svg',
                    alt: `${tvShow.name} poster`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [getPosterUrl(tvShow.poster_path) || '/logo-icon.svg'],
        },
    };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const tvId = parseInt(id);

    try {
        const tvShow = await getTVDetails(tvId);

        if (!tvShow) {
            return {
                title: 'Serie no encontrada - FilmiFy',
            };
        }

        return buildTvMetadata(tvShow);
    } catch (error) {
        return {
            title: 'Serie no encontrada - FilmiFy',
        };
    }
}

export default async function TVDetailsPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const sp = await searchParams;
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

    const appUrl = getOptionalApiKeys().appUrl;
    const posterUrl = getPosterUrl(tvShow.poster_path);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        name: tvShow.name,
        description: tvShow.overview,
        image: posterUrl || `${appUrl}/logo-icon.svg`,
        url: `${appUrl}/tv/${tvShow.id}`,
        genre: tvShow.genres?.map((genre) => genre.name).filter(Boolean),
        actor: cast.map((person) => person.name),
        numberOfSeasons: tvShow.number_of_seasons,
    };

    const isGlobalTV = await isTVDevice();
    const isManualTV = sp.tv === 'true';

    if (isGlobalTV) {
        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <TVDetailsPageTV
                    tvShow={tvShow}
                    trailer={trailer}
                    cast={cast}
                    creator={creator}
                />
            </>
        );
    }

    if (isManualTV) {
        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <TVLayoutWrapper
                    forceTVMode={true}
                    tvLayout={
                        <div className="flex min-h-screen bg-background text-white">
                            <TVSidebar />
                            <main className="flex-1 ml-0 lg:ml-24 p-8 overflow-x-hidden">
                                <TVDetailsPageTV
                                    tvShow={tvShow}
                                    trailer={trailer}
                                    cast={cast}
                                    creator={creator}
                                />
                            </main>
                        </div>
                    }>
                    <div />
            </TVLayoutWrapper>
            </>
        );
    }

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
