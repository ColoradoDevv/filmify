import { getTVDetails, getBackdropUrl, getPosterUrl, getProfileUrl, TMDBError } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import { getOptionalApiKeys } from '@/lib/env';
import {
    isSeriesAvailableOnVimeus,
    filterAvailableSeries,
    getSeriesEpisodeMap,
} from '@/server/services/vimeus';
import SeriesPlayer, { type SeasonEpisodes } from '@/components/features/SeriesPlayer';
import MovieActions from '@/components/features/MovieActions';
import ReviewsSection from '@/components/features/ReviewsSection';
import Image from 'next/image';
import { Star, Calendar, ArrowLeft, Tv, User, Film } from 'lucide-react';
import Link from 'next/link';
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

function buildTvMetadata(tvShow: Awaited<ReturnType<typeof getTVDetails>>): Metadata {
    const canonical = `/tv/${tvShow.id}`;
    const title = `Ver ${tvShow.name} online | FilmiFy`;
    const description = tvShow.overview
        ? `${tvShow.overview} Mira ${tvShow.name} online gratis en FilmiFy, todas las temporadas, sin registro.`
        : `Mira ${tvShow.name} online en FilmiFy, con temporadas completas, reparto y tráiler.`;
    const keywordSet = new Set<string>([
        tvShow.name,
        `ver ${tvShow.name}`,
        `ver ${tvShow.name} online`,
        `${tvShow.name} online gratis`,
        'serie online',
        'ver serie',
        'streaming',
        'temporadas',
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
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
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
            return { title: 'Serie no encontrada - FilmiFy' };
        }
        return buildTvMetadata(tvShow);
    } catch (error) {
        if (error instanceof TMDBError && error.status === 404) {
            return { title: 'Serie no encontrada - FilmiFy' };
        }
        return { title: 'Detalles de Serie - FilmiFy' };
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
        console.error('Error fetching TV details:', error);
        if (error instanceof TMDBError && error.status === 404) {
            notFound();
        }
        throw error;
    }

    // Availability gate: only publish pages for series the visitor can watch.
    const isAvailable = await isSeriesAvailableOnVimeus(tvId);
    if (!isAvailable) notFound();

    const backdropUrl = getBackdropUrl(tvShow.backdrop_path);
    const posterUrl = getPosterUrl(tvShow.poster_path);
    const firstAirYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : null;

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

    const creator = tvShow.credits?.crew.find(
        (person) => person.job === 'Executive Producer' || person.job === 'Creator'
    );
    const cast = tvShow.credits?.cast.slice(0, 12) || [];

    // Episodes actually available on Vimeus; fall back to TMDB seasons when
    // the listing has no episode rows for this series.
    let seasons: SeasonEpisodes[] = await getSeriesEpisodeMap(tvId);
    if (seasons.length === 0) {
        seasons = (tvShow.seasons ?? [])
            .filter((s) => s.season_number > 0 && s.episode_count > 0)
            .map((s) => ({
                season: s.season_number,
                episodes: Array.from({ length: s.episode_count }, (_, i) => i + 1),
            }));
    }

    // Recommendations — only series that are playable.
    const recommendations = await filterAvailableSeries(
        (tvShow.recommendations?.results ?? []).slice(0, 18)
    );

    const appUrl = getOptionalApiKeys().appUrl;
    const tvJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TVSeries',
        name: tvShow.name,
        description: tvShow.overview || undefined,
        image: posterUrl || backdropUrl || undefined,
        datePublished: tvShow.first_air_date || undefined,
        numberOfSeasons: tvShow.number_of_seasons || undefined,
        numberOfEpisodes: tvShow.number_of_episodes || undefined,
        actor: cast.map((person) => ({ '@type': 'Person', name: person.name })),
        genre: tvShow.genres?.map((genre) => genre.name).filter(Boolean),
        sameAs: tvShow.homepage ? [tvShow.homepage] : undefined,
        aggregateRating: tvShow.vote_average ? {
            '@type': 'AggregateRating',
            ratingValue: tvShow.vote_average.toFixed(1),
            ratingCount: tvShow.vote_count,
        } : undefined,
    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: appUrl },
            { '@type': 'ListItem', position: 2, name: 'Series', item: `${appUrl}/browse?category=tv` },
            { '@type': 'ListItem', position: 3, name: tvShow.name, item: `${appUrl}/tv/${tvShow.id}` },
        ],
    };

    const jsonLd = [tvJsonLd, breadcrumbJsonLd];

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
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ── Cuevana/LaMovie-style layout: player front and center ── */}
            <div className="relative min-h-screen pb-16">

                {/* Ambient backdrop behind the player */}
                {backdropUrl && (
                    <div className="absolute inset-x-0 top-0 h-[480px] overflow-hidden pointer-events-none" aria-hidden>
                        <Image
                            src={backdropUrl}
                            alt=""
                            fill
                            className="object-cover opacity-20 blur-sm scale-105"
                            sizes="100vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
                    </div>
                )}

                <div className="relative max-w-5xl mx-auto">

                    {/* Back link */}
                    <Link
                        href="/browse?category=tv"
                        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a series
                    </Link>

                    {/* ── Poster (left) + Player (right) ── */}
                    <div className="grid lg:grid-cols-[220px,1fr] gap-5 items-stretch">
                        <aside className="hidden lg:flex flex-col gap-3">
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                {posterUrl ? (
                                    <Image
                                        src={posterUrl}
                                        alt={`Póster de ${tvShow.name}`}
                                        fill
                                        className="object-cover"
                                        sizes="220px"
                                        priority
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-surface-container flex items-center justify-center">
                                        <Tv className="w-10 h-10 text-text-muted opacity-30" />
                                    </div>
                                )}
                            </div>
                            {/* Quick facts fill the remaining column height */}
                            <div className="flex-1 rounded-xl bg-surface-container-low border border-outline-variant p-3 flex flex-col justify-center gap-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">Rating</span>
                                    <span className="flex items-center gap-1 text-primary font-bold">
                                        <Star className="w-3.5 h-3.5 fill-primary" />
                                        {tvShow.vote_average ? tvShow.vote_average.toFixed(1) : 'NR'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">Temporadas</span>
                                    <span className="text-white font-medium">{tvShow.number_of_seasons}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">Episodios</span>
                                    <span className="text-white font-medium">{tvShow.number_of_episodes}</span>
                                </div>
                            </div>
                        </aside>

                        {/* Player */}
                        <SeriesPlayer
                            tmdbId={tvShow.id}
                            title={tvShow.name}
                            backdropUrl={backdropUrl}
                            trailerKey={trailer?.key ?? null}
                            seasons={seasons}
                        />
                    </div>

                    {/* ── Title bar ── */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mt-5">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                                {tvShow.name}
                                {firstAirYear && !isNaN(firstAirYear) && (
                                    <span className="text-text-secondary font-normal"> ({firstAirYear})</span>
                                )}
                            </h1>
                            {tvShow.original_name !== tvShow.name && (
                                <p className="text-sm text-text-secondary mt-0.5">{tvShow.original_name}</p>
                            )}

                            {/* Meta chips */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold">
                                    <Star className="w-3.5 h-3.5 fill-primary" />
                                    {tvShow.vote_average ? tvShow.vote_average.toFixed(1) : 'NR'}
                                </span>
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                                    <Tv className="w-3.5 h-3.5" />
                                    {tvShow.number_of_seasons} temporada{tvShow.number_of_seasons === 1 ? '' : 's'}
                                </span>
                                {firstAirYear && !isNaN(firstAirYear) && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {firstAirYear}
                                    </span>
                                )}
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary text-xs font-bold">
                                    {tvShow.status === 'Ended' ? 'Finalizada' : 'En emisión'}
                                </span>
                            </div>
                        </div>

                        <MovieActions movie={tvShow} />
                    </div>

                    {/* Genres */}
                    {tvShow.genres && tvShow.genres.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {tvShow.genres.map((genre) => (
                                <Link
                                    key={genre.id}
                                    href={`/browse?category=tv&genre=${genre.id}`}
                                    className="px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-xs font-medium text-text-secondary hover:text-white hover:border-primary/40 transition-colors"
                                >
                                    {genre.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* ── Sinopsis + info ── */}
                    <section className="mt-8">
                        <div className="space-y-4 min-w-0">
                            {tvShow.tagline && (
                                <p className="text-base italic text-text-secondary">&ldquo;{tvShow.tagline}&rdquo;</p>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-white mb-2">Sinopsis</h2>
                                <p className="text-text-secondary leading-relaxed">
                                    {tvShow.overview || 'Sin descripción disponible.'}
                                </p>
                            </div>

                            {/* Compact info rows */}
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm pt-2">
                                {creator && (
                                    <>
                                        <dt className="text-text-muted">Creador</dt>
                                        <dd className="text-white font-medium">{creator.name}</dd>
                                    </>
                                )}
                                <dt className="text-text-muted">Idioma original</dt>
                                <dd className="text-white font-medium uppercase">{tvShow.original_language}</dd>
                                {tvShow.external_ids?.imdb_id && (
                                    <>
                                        <dt className="text-text-muted">IMDb</dt>
                                        <dd>
                                            <a
                                                href={`https://www.imdb.com/title/${tvShow.external_ids.imdb_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#f5c518] font-semibold hover:underline"
                                            >
                                                Ver ficha
                                            </a>
                                        </dd>
                                    </>
                                )}
                            </dl>
                        </div>
                    </section>

                    {/* ── Reparto: compact horizontal row ── */}
                    {cast.length > 0 && (
                        <section className="mt-10">
                            <h2 className="text-lg font-bold text-white mb-4">Reparto</h2>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {cast.map((person) => (
                                    <div key={person.id} className="flex-shrink-0 w-20 text-center">
                                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-container border border-white/10 mx-auto">
                                            {person.profile_path ? (
                                                <Image
                                                    src={getProfileUrl(person.profile_path) || ''}
                                                    alt={person.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="80px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User className="w-7 h-7 text-text-muted opacity-40" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-semibold text-white mt-2 line-clamp-2 leading-tight">
                                            {person.name}
                                        </p>
                                        <p className="text-[10px] text-text-muted line-clamp-1">
                                            {person.character}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Recomendaciones (solo disponibles) ── */}
                    {recommendations.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Film className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-bold text-white">También te puede gustar</h2>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {recommendations.slice(0, 12).map((rec) => (
                                    <Link
                                        key={rec.id}
                                        href={`/tv/${rec.id}`}
                                        className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-container border border-white/5 hover:border-primary/50 transition-all"
                                    >
                                        {rec.poster_path ? (
                                            <Image
                                                src={getPosterUrl(rec.poster_path) || ''}
                                                alt={rec.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs px-2 text-center">
                                                {rec.name}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                            <p className="text-white font-semibold text-xs line-clamp-2">{rec.name}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Comentarios (login solo aquí, como mejora opcional) ── */}
                    <div className="mt-12">
                        <ReviewsSection mediaId={tvId} mediaType="tv" />
                    </div>
                </div>
            </div>
        </>
    );
}
