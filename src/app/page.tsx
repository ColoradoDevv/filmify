import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Info, Flame, Clapperboard } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import PlatformContent from '@/components/layout/PlatformContent';
import PlatformHeader from '@/components/layout/PlatformHeader';
import MobileTabBar from '@/components/layout/MobileTabBar';
import TrendingScroller from '@/components/features/TrendingScroller';
import MovieGrid from '@/components/features/MovieGrid';
import HorizontalRow from '@/components/features/HorizontalRow';
import AdBanner1 from '@/components/ads/AdBanner1';
import { DonateBanner } from '@/components/ui/DonateButton';
import { getTrending, getImageUrl } from '@/server/services/tmdb';
import { GENRE_PAGES } from '@/lib/genres';
import { filterAvailableMovies, filterAvailableSeries, getRecentlyAddedMovies } from '@/server/services/vimeus';
import { getOptionalApiKeys } from '@/lib/env';
import type { Movie, TVShow } from '@/types/tmdb';

/**
 * ISR: the homepage is statically generated and revalidated every 30 min.
 * No per-request work (headers/cookies) → instant TTFB, great Core Web
 * Vitals, and crawlers always get fully-rendered HTML.
 */
export const revalidate = 1800;

export const metadata: Metadata = {
  // `absolute` evita que el template "%s | FilmiFy" del layout duplique la marca.
  // Lidera con la acción + keyword (como Plex/JustWatch) y reserva la marca al final.
  title: {
    absolute: 'Ver Películas y Series Online Gratis - FilmiFy | Cine en HD',
  },
  description: 'Ver películas y series online gratis y en HD, sin registro. Catálogo actualizado a diario: estrenos, tendencias y clásicos. Reproduce al instante en FilmiFy.',
  keywords: [
    'FilmiFy',
    'filmify',
    'ver películas online',
    'ver películas gratis',
    'películas online sin registrarse',
    'ver series online',
    'streaming películas',
    'series online',
    'cine online',
    'estrenos',
  ],
  openGraph: {
    title: 'FilmiFy - Ver películas y series online | Cine en streaming',
    description: 'Mira películas y series online en FilmiFy sin registrarte. Catálogo actualizado a diario con estrenos, tendencias y clásicos.',
    type: 'website',
    // og:image: inherits the generated 1200x630 PNG from opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FilmiFy - Ver películas y series online | Cine en streaming',
    description: 'Mira películas y series online en FilmiFy sin registrarte. Catálogo actualizado a diario con estrenos, tendencias y clásicos.',
  },
};

/**
 * PUBLIC HOMEPAGE — full catalog, no login required.
 *
 * Cuevana-style shell: fixed sidebar with all sections on the left, search
 * bar in the top header, content grid front and center. Same shell as the
 * rest of the platform (/browse, /movie, etc.) so navigation is seamless.
 * Authentication is an optional enhancement (favorites, comments) surfaced
 * in the header — never a blocker.
 */
export default async function HomePage() {
  // Fetch trending movies (day for hero/scroller, week for the main grid),
  // trending series, and the latest titles synced to the streaming provider.
  // Cada fetch degrada a vacío si su proveedor (TMDB/Vimeus) falla, para que un
  // fallo puntual de un tercero NO tumbe toda la home (la peor página para caer).
  const emptyMoviePage = { results: [] as Movie[], page: 1, total_pages: 0, total_results: 0 };
  const emptyTVPage = { results: [] as TVShow[], page: 1, total_pages: 0, total_results: 0 };
  const [trendingDay, trendingWeek, trendingTV, recentlyAdded] = await Promise.all([
    getTrending('movie', 'day', 1).catch(() => emptyMoviePage),
    getTrending('movie', 'week', 1).catch(() => emptyMoviePage),
    getTrending('tv', 'week', 1).catch(() => emptyTVPage),
    getRecentlyAddedMovies(18).catch(() => []),
  ]);

  // Only show titles that are actually playable on the streaming provider —
  // we never advertise content the visitor can't watch.
  const [availableDay, availableWeek, availableTV, availableRecentlyAdded] = await Promise.all([
    filterAvailableMovies(trendingDay.results).catch(() => trendingDay.results),
    filterAvailableMovies(trendingWeek.results).catch(() => trendingWeek.results),
    filterAvailableSeries(trendingTV.results).catch(() => trendingTV.results),
    filterAvailableMovies(recentlyAdded.map((m) => ({ id: m.tmdb_id } as any))).catch(() => [] as { id: number }[]),
  ]);

  const heroMovie = availableDay[0];
  const scrollerMovies = availableDay.slice(0, 15);
  const gridMovies = availableWeek;
  const tvShows = availableTV.slice(0, 15);

  const availableRecentlyAddedIds = new Set(availableRecentlyAdded.map((x: any) => x.id));
  const recentlyAddedFiltered = recentlyAdded.filter((m) => availableRecentlyAddedIds.has(m.tmdb_id));


  const backdropUrl = heroMovie
    ? getImageUrl(heroMovie.backdrop_path, 'original')
    : null;

  // JSON-LD Structured Data for SEO.
  // Organization + WebSite live in the root layout (site-wide). Here we only
  // add the WebApplication node, with URLs derived from the configured domain.
  const appUrl = getOptionalApiKeys().appUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${appUrl}/#webapp`,
    name: "FilmiFy",
    url: appUrl,
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    description: "Plataforma pública para ver películas y series online sin registro, con búsqueda inteligente y catálogo actualizado a diario",
    featureList: [
      "Ver películas y series sin registrarse",
      "Búsqueda inteligente de películas",
      "Catálogo actualizado diariamente",
      "Favoritos y listas con cuenta opcional"
    ],
    inLanguage: "es-ES"
  };

  // ItemList: tells Google exactly which titles this page showcases —
  // strengthens internal linking signals toward the movie pages.
  const itemListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Películas en tendencia en FilmiFy',
    itemListElement: gridMovies.slice(0, 10).map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.title,
      url: `${appUrl}/movie/${m.id}`,
    })),
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([structuredData, itemListData]).replace(/</g, '\\u003c')
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Sidebar — all sections, Cuevana style. Suspense: uses useSearchParams. */}
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>

        <PlatformContent>
          {/* Top header: search + optional login */}
          <PlatformHeader />

          <main className="px-3 py-4 sm:px-6 sm:py-6 lg:p-8 space-y-8 sm:space-y-10 pb-16">

            {/* ── Hero: #1 trending title, watch instantly ─────────────── */}
            <section
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 shadow-2xl min-h-[60vh] sm:min-h-[55vh] flex items-end"
              aria-label="Película destacada"
            >
              {heroMovie && backdropUrl && (
                <div className="absolute inset-0">
                  <Image
                    src={backdropUrl}
                    alt={`Ver ${heroMovie.title} online gratis en FilmiFy — películas y series en streaming HD`}
                    fill
                    className="object-cover"
                    priority
                    {...({ fetchPriority: 'high' } as any)}
                    quality={90}
                    sizes="100vw"
                  />
                </div>
              )}

              {/* Gradient overlays for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent" />

              <div className="relative z-10 w-full p-4 sm:p-10">
                <div className="max-w-2xl space-y-3 sm:space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-gray-300">
                      #1 en tendencias hoy
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-5xl font-bold tracking-tight text-white line-clamp-2">
                    {heroMovie?.title || 'Ver películas y series online'}
                  </h1>

                  <p className="text-sm sm:text-lg text-gray-300 line-clamp-2 sm:line-clamp-3">
                    {heroMovie?.overview ||
                      'Miles de películas y series para ver al instante, sin registro.'}
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                    {heroMovie && (
                      <>
                        <Link
                          href={`/movie/${heroMovie.id}`}
                          className="inline-flex items-center justify-center gap-2 h-12 px-7 bg-primary text-white rounded-xl font-semibold text-base hover:scale-105 transition-all duration-300 glow-primary"
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Ver ahora
                        </Link>
                        <Link
                          href={`/movie/${heroMovie.id}`}
                          className="inline-flex items-center justify-center gap-2 h-12 px-7 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-semibold text-base backdrop-blur-sm transition-all duration-300"
                        >
                          <Info className="w-5 h-5" />
                          Más información
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Trending scroller (tendencias del día) ───────────────── */}
            <TrendingScroller movies={scrollerMovies} />

            {/* ── Agregadas recientemente (filtradas por disponibilidad) ──── */}
            {recentlyAddedFiltered.length > 0 && (

              <section aria-label="Películas agregadas recientemente">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Agregadas recientemente
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {recentlyAddedFiltered.map((m) => (

                    <Link
                      key={m.tmdb_id}
                      href={`/movie/${m.tmdb_id}`}
                      className="group flex-shrink-0 w-32"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-container border border-white/5 group-hover:border-primary/50 transition-all">
                        {m.poster ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w342${m.poster}`}
                            alt={m.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="128px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs px-2 text-center">
                            {m.title}
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-primary text-[9px] font-bold text-white uppercase tracking-wide">
                          Nuevo
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white mt-1.5 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {m.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Publicidad ────────────────────────────────────────────── */}
            <AdBanner1 />

            {/* ── Series populares (solo disponibles) ──────────────────── */}
            {tvShows.length > 0 && (
              <section aria-label="Series populares">
                {/* No `icon` prop: component refs can't cross the server→client boundary */}
                <HorizontalRow
                  title="Series populares"
                  items={tvShows}
                  mediaType="tv"
                />
                <div className="mt-3 text-right">
                  <Link
                    href="/browse?category=tv"
                    className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    Ver todas las series →
                  </Link>
                </div>
              </section>
            )}

            {/* ── Banner de apoyo / donación ───────────────────────────── */}
            <DonateBanner />

            {/* ── Catálogo de películas en tendencia ───────────────────── */}
            <section aria-label="Películas en tendencia">
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-white">
                  <Clapperboard className="w-7 h-7 text-primary" />
                  Películas en tendencia
                </h2>
                <Link
                  href="/browse"
                  className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Explorar catálogo →
                </Link>
              </div>
              <MovieGrid initialMovies={gridMovies} mediaType="movie" />
            </section>

            {/* ── Géneros: enlazado interno crawlable hacia las landing pages ── */}
            <nav aria-label="Géneros de películas" className="pt-2">
              <h2 className="text-lg font-bold text-white mb-3">Películas por género</h2>
              <div className="flex flex-wrap gap-2">
                {GENRE_PAGES.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/genero/${g.slug}`}
                    className="px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant text-sm font-medium text-text-secondary hover:text-white hover:border-primary/40 transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </nav>
          </main>
        </PlatformContent>

        {/* Navegación inferior — solo móvil/tablet. Suspense: usa useSearchParams. */}
        <Suspense fallback={null}>
          <MobileTabBar />
        </Suspense>
      </div>
    </>
  );
}
