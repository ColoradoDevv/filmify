import { getMovieDetails, getBackdropUrl, getPosterUrl, getProfileUrl, TMDBError } from '@/lib/tmdb/service';
import { getYouTubeTrailerId } from '@/lib/ai';
import { isMovieAvailableOnVimeus, filterAvailableMovies } from '@/server/services/vimeus';
import MoviePlayer from '@/components/features/MoviePlayer';
import MovieActions from '@/components/features/MovieActions';
import ReviewsSection from '@/components/features/ReviewsSection';
import AdBanner2 from '@/components/ads/AdBanner2';
import Image from 'next/image';
import { Star, Clock, Calendar, ArrowLeft, Film, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Movie } from '@/types/tmdb';
import MovieDetailsPageTV from './page-tv';
import TVBodySwitch from '@/components/layout/TVBodySwitch';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function buildMovieMetadata(movie: Awaited<ReturnType<typeof getMovieDetails>>): Metadata {
    const canonical = `/movie/${movie.id}`;
    // El año hace el título único y mejora el CTR en resultados de búsqueda.
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
    const title = year
        ? `Ver ${movie.title} (${year}) online gratis | FilmiFy`
        : `Ver ${movie.title} online gratis | FilmiFy`;

    // El gancho de marca va PRIMERO porque Google trunca a ~155 caracteres.
    // Así, aunque la sinopsis de TMDB falte o esté en otro idioma, la
    // descripción mostrada en resultados sigue siendo relevante a la búsqueda
    // ("ver X online") en lugar de ser sobrescrita por Google con el reparto.
    const hook = year
        ? `Ver ${movie.title} (${year}) online gratis y en HD en FilmiFy, sin registro.`
        : `Ver ${movie.title} online gratis y en HD en FilmiFy, sin registro.`;
    const genres = movie.genres?.map((g) => g.name).filter(Boolean).slice(0, 3).join(', ');
    const synopsis = movie.overview?.trim();
    const extra = synopsis
        ? ` ${synopsis}`
        : genres
            ? ` Película de ${genres}. Mira el tráiler, reparto y reproduce online.`
            : ' Mira el tráiler, reparto y reproduce la película online.';
    const description = (hook + extra).slice(0, 300);

    const keywordSet = new Set<string>([
        movie.title,
        `ver ${movie.title}`,
        `ver ${movie.title} online`,
        `${movie.title} online gratis`,
        'película online',
        'ver película',
        'streaming',
    ]);
    movie.genres?.forEach((genre) => {
        if (genre.name) {
            keywordSet.add(genre.name);
            keywordSet.add(`películas de ${genre.name}`);
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
        // NOTA: el og:image lo genera opengraph-image.tsx de este segmento
        // (backdrop + póster + título + logo). No definimos images aquí para
        // no competir con la imagen generada.
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

// Metadata de "no encontrada": noindex explícito para que Google NO indexe la
// página (evita las soft-404 que reportaba Search Console). Sin esto, el layout
// raíz imponía `index, follow` y la página servía contenido 404 con HTTP 200.
const NOT_FOUND_METADATA: Metadata = {
    title: 'Película no encontrada - FilmiFy',
    robots: { index: false, follow: false },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) return NOT_FOUND_METADATA;

    try {
        // Solo marcamos noindex cuando la peli NO existe en TMDB (404 real e
        // inequívoco). Deliberadamente NO acoplamos el noindex al probe de
        // disponibilidad de Vimeus: ese probe puede fallar transitoriamente
        // (timeout/rate-limit) y des-indexaría contenido válido. El body sí hace
        // notFound() si no es reproducible (404 con noindex vía not-found.tsx),
        // pero ahí un fallo solo afecta esa request, no la indexación a largo plazo.
        const movie = await getMovieDetails(movieId);
        if (!movie) return NOT_FOUND_METADATA;
        return buildMovieMetadata(movie);
    } catch (error) {
        if (error instanceof TMDBError && error.status === 404) {
            return NOT_FOUND_METADATA;
        }
        // Error transitorio (no un 404): no marcamos noindex para no des-indexar
        // una peli válida por un fallo puntual de la API.
        return { title: 'Detalles de Película - FilmiFy' };
    }
}

function formatRuntime(minutes: number): string | null {
    if (!minutes || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

async function fetchMovieData(movieId: number) {
    const [movie, isAvailable] = await Promise.all([
        getMovieDetails(movieId).catch((error) => {
            if (error instanceof TMDBError && error.status === 404) return null;
            throw error;
        }),
        isMovieAvailableOnVimeus(movieId).catch(() => false),
    ]);

    if (!movie || !isAvailable) return null;

    let recommendations: Movie[] = [];
    try {
        recommendations = await filterAvailableMovies(
            (movie.recommendations?.results ?? []).slice(0, 18)
        );
    } catch {
        // Mostramos la página sin recomendaciones
    }

    return { movie, recommendations };
}

export default async function MovieDetailsPage({ params }: PageProps) {
    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) notFound();

    const data = await fetchMovieData(movieId);
    if (!data) notFound();

    const { movie, recommendations } = data;

    const backdropUrl = getBackdropUrl(movie.backdrop_path);
    const posterUrl = getPosterUrl(movie.poster_path);

    const runtime = formatRuntime(movie.runtime);
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;

    // Tráiler
    let trailer = movie.videos?.results.find(
        (video) => video.type === 'Trailer' && video.site === 'YouTube'
    );
    if (!trailer) {
        try {
            const aiTrailerId = await getYouTubeTrailerId(
                movie.title,
                releaseYear?.toString() ?? '',
                'movie'
            );
            if (aiTrailerId) {
                trailer = {
                    id: 'ai-generated',
                    key: aiTrailerId,
                    name: 'Tráiler oficial',
                    site: 'YouTube',
                    size: 1080,
                    type: 'Trailer',
                    official: false,
                    published_at: new Date().toISOString(),
                };
            }
        } catch {
            // No se pudo obtener tráiler alternativo
        }
    }

    const director = movie.credits?.crew.find((person) => person.job === 'Director');
    const cast = movie.credits?.cast.slice(0, 12) || [];
    const writers = movie.credits?.crew.filter((person) =>
        ['Screenplay', 'Writer', 'Story'].includes(person.job)
    ) || [];
    const uniqueWriters = Array.from(new Set(writers.map((a) => a.id)))
        .map((id) => writers.find((a) => a.id === id))
        .filter(Boolean);

    const releaseDates =
        movie.release_dates?.results.find((r) => r.iso_3166_1 === 'MX') ||
        movie.release_dates?.results.find((r) => r.iso_3166_1 === 'US');
    const certification =
        releaseDates?.release_dates.find((r) => r.certification)?.certification || 'NR';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // JSON-LD
    const movieJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: movie.title,
        description: movie.overview || undefined,
        image: posterUrl || getBackdropUrl(movie.backdrop_path) || undefined,
        datePublished: movie.release_date || undefined,
        director: director ? { '@type': 'Person', name: director.name } : undefined,
        actor: cast.map((person) => ({ '@type': 'Person', name: person.name })),
        author: uniqueWriters.map((writer) => ({ '@type': 'Person', name: writer?.name })),
        creator: uniqueWriters.map((writer) => ({ '@type': 'Person', name: writer?.name })),
        genre: movie.genres?.map((genre) => genre.name).filter(Boolean),
        duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
        productionCompany: movie.production_companies?.map((company) => ({
            '@type': 'Organization',
            name: company.name,
        })),
        sameAs: movie.homepage ? [movie.homepage] : undefined,
        aggregateRating: movie.vote_average
            ? {
                  '@type': 'AggregateRating',
                  ratingValue: movie.vote_average.toFixed(1),
                  ratingCount: movie.vote_count,
              }
            : undefined,
        trailer: trailer
            ? {
                  '@type': 'VideoObject',
                  name: trailer.name,
                  description: trailer.name,
                  embedUrl: `https://www.youtube.com/embed/${trailer.key}`,
                  thumbnailUrl: `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`,
                  uploadDate: trailer.published_at,
              }
            : undefined,
        // WatchAction: tells Google this page is where the movie can be
        // watched — eligible for "Watch now" rich results.
        potentialAction: {
            '@type': 'WatchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${appUrl}/movie/${movie.id}`,
                actionPlatform: [
                    'https://schema.org/DesktopWebPlatform',
                    'https://schema.org/MobileWebPlatform',
                ],
            },
            expectsAcceptanceOf: {
                '@type': 'Offer',
                price: 0,
                priceCurrency: 'USD',
                availabilityStarts: movie.release_date || undefined,
            },
        },
    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: appUrl },
            { '@type': 'ListItem', position: 2, name: 'Explorar', item: `${appUrl}/browse` },
            { '@type': 'ListItem', position: 3, name: movie.title, item: `${appUrl}/movie/${movie.id}` },
        ],
    };

    const jsonLd = [movieJsonLd, breadcrumbJsonLd];

    // TVBodySwitch decide en CLIENTE entre la vista web y la vista TV, sin leer
    // cookies/headers/searchParams en el servidor (evita lecturas de request
    // redundantes en cada render). La latencia alta venía del waterfall de
    // Vimeus, ya paralelizado — no del dinamismo.
    const tvBody = (
        <MovieDetailsPageTV
            movie={movie}
            trailer={trailer}
            cast={cast}
            certification={certification}
            director={director}
        />
    );

    // ── Desktop / mobile layout ──────────────────────────────────
    return (
        <TVBodySwitch tvBody={tvBody}>
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="relative min-h-screen pb-16">
                {/* Ambient backdrop */}
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
                        href="/browse"
                        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mt-4 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al catálogo
                    </Link>

                    {/* ── Player (full width, sin grid) ── */}
                    <MoviePlayer
                        tmdbId={movie.id}
                        title={movie.title}
                        backdropUrl={backdropUrl}
                        trailerKey={trailer?.key ?? null}
                    />

                    {/* Mobile quick facts */}
                    <div className="lg:hidden flex items-center gap-3 mt-3 mb-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold">
                            <Star className="w-3.5 h-3.5 fill-primary" />
                            {movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}
                        </span>
                        {runtime && (
                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                                {runtime}
                            </span>
                        )}
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary font-bold">
                            {certification}
                        </span>
                    </div>

                    {/* ── Title + actions ────────────────────────── */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mt-6">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                                {movie.title}
                                {releaseYear && !isNaN(releaseYear) && (
                                    <span className="text-text-secondary font-normal">
                                        {' '}
                                        ({releaseYear})
                                    </span>
                                )}
                            </h1>
                            {movie.original_title !== movie.title && (
                                <p className="text-sm text-text-secondary mt-0.5">
                                    {movie.original_title}
                                </p>
                            )}

                            {/* Meta chips (desktop) */}
                            <div className="hidden lg:flex flex-wrap items-center gap-2 mt-3 text-sm">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold">
                                    <Star className="w-3.5 h-3.5 fill-primary" />
                                    {movie.vote_average ? movie.vote_average.toFixed(1) : 'NR'}
                                </span>
                                {runtime && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                                        <Clock className="w-3.5 h-3.5" />
                                        {runtime}
                                    </span>
                                )}
                                {releaseYear && !isNaN(releaseYear) && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {releaseYear}
                                    </span>
                                )}
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary text-xs font-bold">
                                    {certification}
                                </span>
                            </div>
                        </div>

                        <MovieActions movie={movie as unknown as Movie} />
                    </div>

                    {/* Genres */}
                    {movie.genres && movie.genres.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {movie.genres.map((genre) => (
                                <Link
                                    key={genre.id}
                                    href={`/browse?genre=${genre.id}`}
                                    className="px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant text-xs font-medium text-text-secondary hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all"
                                >
                                    {genre.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* ── Synopsis + details ─────────────────────── */}
                    <section className="mt-8">
                        <div className="space-y-4 min-w-0">
                            {movie.tagline && (
                                <p className="text-base italic text-text-secondary border-l-2 border-primary pl-4">
                                    &ldquo;{movie.tagline}&rdquo;
                                </p>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-white mb-2">Sinopsis</h2>
                                <p className="text-text-secondary leading-relaxed">
                                    {movie.overview || 'Sin descripción disponible.'}
                                </p>
                            </div>

                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm pt-2">
                                {director && (
                                    <>
                                        <dt className="text-text-muted">Director</dt>
                                        <dd className="text-white font-medium">{director.name}</dd>
                                    </>
                                )}
                                {uniqueWriters.length > 0 && (
                                    <>
                                        <dt className="text-text-muted">Guion</dt>
                                        <dd className="text-white font-medium truncate">
                                            {uniqueWriters
                                                .slice(0, 2)
                                                .map((w) => w?.name)
                                                .join(', ')}
                                        </dd>
                                    </>
                                )}
                                <dt className="text-text-muted">Idioma original</dt>
                                <dd className="text-white font-medium uppercase">
                                    {movie.original_language}
                                </dd>
                                {movie.external_ids?.imdb_id && (
                                    <>
                                        <dt className="text-text-muted">IMDb</dt>
                                        <dd>
                                            <a
                                                href={`https://www.imdb.com/title/${movie.external_ids.imdb_id}`}
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

                    <div className="mt-10">
                        <AdBanner2 />
                    </div>

                    {/* ── Cast ───────────────────────────────────── */}
                    {cast.length > 0 && (
                        <section className="mt-10">
                            <h2 className="text-lg font-bold text-white mb-4">Reparto</h2>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                                {cast.map((person) => (
                                    <div
                                        key={person.id}
                                        className="flex-shrink-0 w-20 text-center"
                                    >
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

                    {/* ── Recommendations ────────────────────────── */}
                    {recommendations.length > 0 && (
                        <section className="mt-10">
                            <div className="flex items-center gap-2 mb-4">
                
                                <h2 className="text-lg font-bold text-white">
                                    También te puede gustar
                                </h2>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {recommendations.slice(0, 12).map((rec) => (
                                    <Link
                                        key={rec.id}
                                        href={`/movie/${rec.id}`}
                                        className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-container border border-white/5 hover:border-primary/50 transition-all"
                                    >
                                        {rec.poster_path ? (
                                            <Image
                                                src={getPosterUrl(rec.poster_path) || ''}
                                                alt={rec.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs px-2 text-center">
                                                {rec.title}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                            <p className="text-white font-semibold text-xs line-clamp-2">
                                                {rec.title}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Reviews ────────────────────────────────── */}
                    <div className="mt-12">
                        <ReviewsSection mediaId={movieId} mediaType="movie" />
                    </div>
                </div>
            </div>
        </>
        </TVBodySwitch>
    );
}