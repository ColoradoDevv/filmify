import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowRight, Film, Heart, Newspaper, Search, Zap } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TrendingScroller from '@/components/features/TrendingScroller';
import { headers } from 'next/headers';
import { getTrending, getImageUrl } from '@/server/services/tmdb';
import type { Movie } from '@/types/tmdb';

export const metadata: Metadata = {
  title: 'FilmiFy - Dónde ver películas y series online | Cine en streaming',
  description: 'FilmiFy te ayuda a encontrar dónde ver películas y series online, con opciones de streaming, alquiler y compra en una sola plataforma.',
  keywords: [
    'FilmiFy',
    'filmify',
    'dónde ver películas',
    'ver películas online',
    'dónde ver series',
    'streaming películas',
    'series online',
    'cine online',
    'alquilar películas',
    'comprar películas'
  ],
  openGraph: {
    title: 'FilmiFy - Dónde ver películas y series online | Cine en streaming',
    description: 'FilmiFy te ayuda a encontrar dónde ver películas y series online, con opciones de streaming, alquiler y compra en una sola plataforma.',
    type: 'website',
    images: [
      {
        url: '/logo-icon.svg',
        alt: 'FilmiFy: dónde ver películas y series online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FilmiFy - Dónde ver películas y series online | Cine en streaming',
    description: 'FilmiFy te ayuda a encontrar dónde ver películas y series online, con opciones de streaming, alquiler y compra en una sola plataforma.',
  },
};

export default async function LandingPage() {
  const userAgent = (await headers()).get('user-agent') || '';
  const isMobile = /mobile/i.test(userAgent);

  const trendingData = await getTrending('movie', 'day', 20);
  const trendingMovies = trendingData.results;
  
  // Select the top trending movie for the hero
  const heroMovie = trendingMovies[0];
  
  // Limit movies for TrendingScroller to 15 to reduce initial DOM nodes
  const scrollerMovies = trendingMovies.slice(0, 15);

  const backdropUrl = heroMovie 
    ? getImageUrl(heroMovie.backdrop_path, isMobile ? 'w780' : 'original') 
    : null;

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
          {heroMovie && backdropUrl && (
            <div className="absolute inset-0">
              <Image
                src={backdropUrl}
                alt={`Imagen de fondo de la película ${heroMovie.title}`}
                fill
                className="object-cover animate-scale-slow"
                priority
                {...({ fetchPriority: 'high' } as any)}
                quality={90}
                sizes="100vw"
              />
            </div>
          )}

          {/* Animated Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-transparent to-background/95" />

          {/* Animated particles effect - Hidden on mobile for performance */}
          <div className="absolute inset-0 opacity-30 hidden md:block">
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
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in-up delay-100 line-clamp-3 text-white px-2">
                {heroMovie?.title || (
                  <>
                    Tu Universo de{' '}
                    <span className="text-gradient-premium inline-block">Películas</span>
                  </>
                )}
              </h1>

              <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 animate-fade-in-up delay-200 line-clamp-3 px-4">
                {heroMovie?.overview || "Descubre, organiza y disfruta de miles de películas. Tu colección personal de películas en un solo lugar."}
              </p>

              {/* CTA Buttons with Premium Effects */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300 px-6">
                <Link
                  href="/login"
                  className="group relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 glow-primary"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10">
                    {heroMovie ? "Ver Detalles" : "Explorar Ahora"}
                  </span>
                  <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 animate-shimmer" />
                </Link>

                <Link
                  href="/editorial"
                  className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  <Newspaper className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
                  <span>Leer Editorial</span>
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
          <div className="absolute bottom-8 left-1/2 animate-bounce-custom">
            <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Trending Movies Scroller */}
        <TrendingScroller movies={scrollerMovies} />

        {/* Features Section */}
        <section className="py-16 relative" aria-label="Características principales de FilmiFy">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Header */}
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
                ¿Por qué <span className="text-primary">FilmiFy</span>?
              </h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Todo lo que necesitas para descubrir y organizar tu cine favorito.
              </p>
            </div>

            {/* Feature grid — compact, borderless */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-surface-light/20 rounded-2xl overflow-hidden border border-surface-light/20">
              {[
                { icon: Search, label: 'Búsqueda',  desc: 'Encuentra cualquier película o serie al instante con filtros avanzados.' },
                { icon: Heart,  label: 'Favoritos', desc: 'Guarda y organiza tu colección personal sincronizada en la nube.' },
                { icon: Zap,    label: 'Catálogo',  desc: 'Miles de títulos actualizados diariamente con los últimos estrenos.' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-surface/60 px-6 py-7 flex flex-col gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{label}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Single CTA */}
            <div className="mt-8 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Comenzar gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer Component */}
        <Footer />
      </main >
    </>
  );
}
