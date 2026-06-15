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
import TVDetailsPageTV from './page-tv';
import TVBodySwitch from '@/components/layout/TVBodySwitch';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function buildTvMetadata(tvShow: Awaited<ReturnType<typeof getTVDetails>>): Metadata {
    const canonical = `/tv/${tvShow.id}`;
    // El año hace el título único y mejora el CTR en resultados de búsqueda.
    const year = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : null;
    const title = year
        ? `Ver ${tvShow.name} (${year}) online gratis | FilmiFy`
        : `Ver ${tvShow.name} online gratis | FilmiFy`;
    // El gancho de marca va PRIMERO porque Google trunca a ~155 caracteres.
    // Así, aunque la sinopsis de TMDB falte o esté en otro idioma, la
    // descripción mostrada en resultados sigue siendo relevante a la búsqueda
    // ("ver X online") en lugar de ser sobrescrita por Google con el reparto.
    const hook = year
        ? `Ver ${tvShow.name} (${year}) online gratis y en HD en FilmiFy, todas las temporadas, sin registro.`
        : `Ver ${tvShow.name} online gratis y en HD en FilmiFy, todas las temporadas, sin registro.`;
    const genres = tvShow.genres?.map((g) => g.name).filter(Boolean).slice(0, 3).join(', ');
    const synopsis = tvShow.overview?.trim();
    const extra = synopsis
        ? ` ${synopsis}`
        : genres
            ? ` Serie de ${genres}. Mira el tráiler, reparto y reproduce los episodios online.`
            : ' Mira el tráiler, reparto y reproduce todos los episodios online.';
    const description = (hook + extra).slice(0, 300);
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
        // `absolute`: el título ya incluye "| FilmiFy"; evita que el template
        // del layout lo duplique ("... | FilmiFy | FilmiFy").
        title: { absolute: title },
        description,
        keywords,
        alternates: { canonical },
        // El og:image lo genera opengraph-image.tsx de este segmento.
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

// Metadata de "no encontrada": noindex explícito → Google no indexa esta página
// (evita las soft-404). Mismo criterio que el body (notFound si no es reproducible).
const NOT_FOUND_METADATA: Metadata = {
    title: 'Serie no encontrada - FilmiFy',
    robots: { index: false, follow: false },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const tvId = parseInt(id);
    if (isNaN(tvId)) return NOT_FOUND_METADATA;

    try {
        // Solo noindex si la serie NO existe en TMDB (404 inequívoco). NO se
        // acopla al probe de Vimeus: un fallo transitorio des-indexaría una serie
        // válida. El body sí hace notFound() si no es reproducible.
        const tvShow = await getTVDetails(tvId);
        if (!tvShow) return NOT_FOUND_METADATA;
        return buildTvMetadata(tvShow);
    } catch (error) {
        if (error instanceof TMDBError && error.status === 404) {
            return NOT_FOUND_METADATA;
        }
        // Error transitorio: no des-indexamos una serie válida por un fallo puntual.
        return { title: 'Detalles de Serie - FilmiFy' };
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
        console.error('Error fetching TV details:', error);
        if (error instanceof TMDBError && error.status === 404) {
            notFound();
        }
        throw error;
    }

    // Availability gate + datos de Vimeus en paralelo: no dependen entre sí ni
    // de getTVDetails (ya resuelto). Antes iban en cascada (availability →
    // episodios → recomendaciones), lo que en frío sumaba decenas de segundos.
    const [isAvailable, episodeMap, recommendations] = await Promise.all([
        isSeriesAvailableOnVimeus(tvId),
        getSeriesEpisodeMap(tvId),
        filterAvailableSeries((tvShow.recommendations?.results ?? []).slice(0, 18)),
    ]);
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
    let seasons: SeasonEpisodes[] = episodeMap;
    if (seasons.length === 0) {
        seasons = (tvShow.seasons ?? [])
            .filter((s) => s.season_number > 0 && s.episode_count > 0)
            .map((s) => ({
                season: s.season_number,
                episodes: Array.from({ length: s.episode_count }, (_, i) => i + 1),
            }));
    }

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
        // WatchAction: eligible for "Watch now" rich results in Google.
        potentialAction: {
            '@type': 'WatchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${appUrl}/tv/${tvShow.id}`,
                actionPlatform: [
                    'https://schema.org/DesktopWebPlatform',
                    'https://schema.org/MobileWebPlatform',
                ],
            },
            expectsAcceptanceOf: {
                '@type': 'Offer',
                price: 0,
                priceCurrency: 'USD',
            },
        },
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

    // TVBodySwitch decide en CLIENTE entre vista web y vista TV, sin leer
    // cookies/headers/searchParams en el servidor (evita lecturas de request
    // redundantes en el render). La latencia venía del waterfall de Vimeus.
    const tvBody = (
        <TVDetailsPageTV
            tvShow={tvShow}
            trailer={trailer}
            cast={cast}
            creator={creator}
        />
    );

    return (
        <TVBodySwitch tvBody={tvBody}>
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
                            className="object-cover opacity-25 blur-sm scale-105"
                            sizes="100vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/85 to-background" />
                    </div>
                )}

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Back link */}
                    <Link
                        href="/browse?category=tv"
                        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mt-4 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a series
                    </Link>

                    {/* ── Player (full width, sin grid) ── */}
                    <SeriesPlayer
                        tmdbId={tvShow.id}
                        title={tvShow.name}
                        backdropUrl={backdropUrl}
                        trailerKey={trailer?.key ?? null}
                        seasons={seasons}
                    />

                    {/* Mobile quick facts */}
                    <div className="lg:hidden flex items-center gap-3 mt-3 mb-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold">
                            <Star className="w-3.5 h-3.5 fill-primary" />
                            {tvShow.vote_average ? tvShow.vote_average.toFixed(1) : 'NR'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                            {tvShow.number_of_seasons} temporada{tvShow.number_of_seasons === 1 ? '' : 's'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                            {tvShow.number_of_episodes} ep.
                        </span>
                    </div>

                    {/* ── Title bar ── */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mt-6">
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
        </TVBodySwitch>
    );
}
