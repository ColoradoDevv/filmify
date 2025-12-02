import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Film, Heart, Search, Sparkles, Zap, Star, Clapperboard } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TrendingScroller from '@/components/features/TrendingScroller';
import { getTrending, getBackdropUrl } from '@/lib/tmdb/service';

export default async function LandingPage() {
  // Fetch trending movies for the day
  const trendingData = await getTrending('movie', 'day');
  const trendingMovies = trendingData.results;

  // Select the top trending movie for the hero
  const heroMovie = trendingMovies[0];
  const backdropUrl = getBackdropUrl(heroMovie?.backdrop_path);

  // JSON-LD Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://filmify.com/#organization",
        name: "FilmiFy",
        url: "https://filmify.com",
        logo: {
          "@type": "ImageObject",
          url: "https://filmify.com/logo-icon.svg",
          width: 512,
          height: 512
        },
        description: "Plataforma premium para descubrir, organizar y disfrutar de películas y series",
        sameAs: [
          "https://twitter.com/filmify",
          "https://facebook.com/filmify"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://filmify.com/#website",
        url: "https://filmify.com",
        name: "FilmiFy",
        description: "Tu universo de películas - Descubre, organiza y disfruta",
        publisher: {
          "@id": "https://filmify.com/#organization"
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://filmify.com/browse?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        },
        inLanguage: "es-ES"
      },
      {
        "@type": "WebApplication",
        "@id": "https://filmify.com/#webapp",
        name: "FilmiFy",
        url: "https://filmify.com",
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD"
        },
        description: "Aplicación web para gestionar tu colección de películas con búsqueda inteligente, listas personalizadas y catálogo actualizado",
        featureList: [
          "Búsqueda inteligente de películas",
          "Listas personalizadas",
          "Catálogo actualizado diariamente",
          "Sincronización en la nube"
        ],
        screenshot: "https://filmify.com/screenshot.jpg"
      }
    ]
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c')
        }}
      />

      <main className="min-h-screen bg-background overflow-hidden flex flex-col">
        <Navbar />

        {/* Hero Section with Cinematic Background */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center" aria-label="Sección principal de bienvenida">
          {/* Dynamic Backdrop Image */}
          {backdropUrl && (
            <div className="absolute inset-0">
              <Image
                src={backdropUrl}
                alt={`Imagen de fondo de la película ${heroMovie.title}`}
                fill
                className="object-cover scale-110 animate-[scale_20s_ease-in-out_infinite]"
                priority
                quality={100}
                unoptimized
              />
            </div>
          )}

          {/* Animated Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-transparent to-background/95" />

          {/* Animated particles effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float" />
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-accent rounded-full animate-float delay-200" />
            <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-float delay-300" />
            <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-accent rounded-full animate-float delay-500" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 z-10">
            <div className="text-center">
              {/* Animated Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 glass-effect rounded-full mb-8 animate-fade-in-up">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-300">
                  Película #1 en Tendencias
                </span>
              </div>

              {/* Main Heading with Premium Gradient */}
              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in-up delay-100 line-clamp-2 text-white">
                {heroMovie?.title || (
                  <>
                    Tu Universo de{' '}
                    <span className="text-gradient-premium inline-block">Películas</span>
                  </>
                )}
              </h1>

              <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 animate-fade-in-up delay-200 line-clamp-3">
                {heroMovie?.overview || "Descubre, organiza y disfruta de miles de películas. Tu colección personal de películas en un solo lugar."}
              </p>

              {/* CTA Buttons with Premium Effects */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                <Link
                  href={heroMovie ? `/movie/${heroMovie.id}` : "/browse"}
                  className="group relative flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 glow-primary"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10">
                    {heroMovie ? "Ver Detalles" : "Explorar Ahora"}
                  </span>
                  <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 animate-shimmer" />
                </Link>

                <Link
                  href="/register"
                  className="group px-8 py-4 glass-effect text-text-primary rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 border border-surface-light/50 hover:border-primary/50"
                >
                  Crear Cuenta
                </Link>
              </div>

              {/* Stats Section - Minimalist Design */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 animate-fade-in-up delay-400">
                <div className="group relative p-6 text-center transition-all duration-300">
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="text-5xl font-bold text-white mb-2 group-hover:text-gradient-premium transition-all duration-300">10K+</div>
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Películas</div>
                </div>

                <div className="group relative p-6 text-center transition-all duration-300">
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="text-5xl font-bold text-white mb-2 group-hover:text-gradient-premium transition-all duration-300">4K</div>
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">En HD</div>
                </div>

                <div className="group relative p-6 text-center transition-all duration-300">
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="text-5xl font-bold text-white mb-2 group-hover:text-gradient-premium transition-all duration-300">24/7</div>
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Actualizado</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Trending Movies Scroller */}
        <TrendingScroller movies={trendingMovies} />

        {/* Features Section - Clean Premium Design */}
        <section className="py-32 relative overflow-hidden" aria-label="Características principales de FilmiFy">
          {/* Subtle Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/20 to-background" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-20 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface/50 backdrop-blur-sm rounded-full mb-6 border border-surface-light/30">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-300">
                  Experiencia Premium
                </span>
              </div>

              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-white">
                ¿Por qué <span className="text-gradient-premium">FilmiFy</span>?
              </h2>

              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Descubre la plataforma de cine más avanzada y elegante.
                <br />
                <span className="text-primary font-semibold">Diseñada para verdaderos cinéfilos.</span>
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Feature 1 - Smart Search */}
              <div className="group relative">
                <div className="relative card-premium p-6 md:p-10 h-full hover:scale-[1.02] transition-all duration-300 animate-scale-in border-l-2 border-l-primary/30">
                  {/* Icon Container */}
                  <div className="relative mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl border border-primary/20 group-hover:border-primary/40 transition-all">
                      <Search className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-primary transition-colors duration-300">
                    Búsqueda Inteligente
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg mb-6">
                    Encuentra cualquier película al instante con nuestra potente búsqueda impulsada por IA y filtros avanzados.
                  </p>

                  {/* Feature Highlights */}
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Resultados instantáneos
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Filtros personalizables
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 2 - Favorites */}
              <div className="group relative">
                <div className="relative card-premium p-6 md:p-10 h-full hover:scale-[1.02] transition-all duration-300 animate-scale-in delay-100 border-l-2 border-l-accent/30">
                  {/* Icon Container */}
                  <div className="relative mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent/15 to-accent/5 rounded-2xl border border-accent/20 group-hover:border-accent/40 transition-all">
                      <Heart className="w-10 h-10 text-accent group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-accent transition-colors duration-300">
                    Colección Personal
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg mb-6">
                    Crea y organiza tus listas personalizadas. Guarda favoritos, marca vistas y comparte con amigos.
                  </p>

                  {/* Feature Highlights */}
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      Listas ilimitadas
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      Sincronización en la nube
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 3 - Infinite Catalog */}
              <div className="group relative">
                <div className="relative card-premium p-6 md:p-10 h-full hover:scale-[1.02] transition-all duration-300 animate-scale-in delay-200 border-l-2 border-l-primary/30">
                  {/* Icon Container */}
                  <div className="relative mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 rounded-2xl border border-primary/20 group-hover:border-primary/40 transition-all">
                      <Zap className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-primary transition-colors duration-300">
                    Catálogo Infinito
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg mb-6">
                    Accede a una biblioteca masiva de películas y series, actualizada diariamente con los últimos estrenos.
                  </p>

                  {/* Feature Highlights */}
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Actualizaciones diarias
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Contenido en 4K/HD
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom CTA Banner - Redesigned (Compact) */}
            <div className="relative group animate-fade-in-up delay-300 mt-20 mb-16">
              <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-12 text-center border border-white/10 shadow-2xl">
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-surface to-accent/20 opacity-90 transition-all duration-500 group-hover:opacity-100" />
                <div className="absolute inset-0 backdrop-blur-3xl" />

                {/* Floating Icons (Smaller) */}
                <div className="absolute top-6 left-6 animate-float delay-100 opacity-20 group-hover:opacity-40 transition-opacity hidden sm:block">
                  <Film className="w-16 h-16 text-primary rotate-12" />
                </div>
                <div className="absolute bottom-6 right-6 animate-float delay-300 opacity-20 group-hover:opacity-40 transition-opacity hidden sm:block">
                  <Clapperboard className="w-20 h-20 text-accent -rotate-12" />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full mb-6 border border-white/10 animate-fade-in-up">
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs font-medium text-white/90">Únete a miles de cinéfilos</span>
                  </div>

                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight tracking-tight text-white">
                    Únete a la <br />
                    <span className="text-gradient-premium relative inline-block">
                      Revolución Cinematográfica
                    </span>
                  </h3>

                  <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
                    Deja de perder tiempo buscando qué ver. <br />
                    <span className="text-white font-medium">Descubre, organiza y comparte</span> tu pasión por el cine.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/register"
                      className="group relative px-8 py-3 bg-white text-black rounded-xl font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Comenzar Gratis
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Link>

                    <Link
                      href="/browse"
                      className="px-8 py-3 glass-effect rounded-xl font-semibold text-base text-white transition-all duration-300 hover:bg-white/10 hover:scale-105"
                    >
                      Explorar Catálogo
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Component */}
        <Footer />
      </main >
    </>
  );
}
