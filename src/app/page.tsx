import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Heart, Search, Sparkles, Zap } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TrendingScroller from '@/components/features/TrendingScroller';
import { getTrending, getBackdropUrl } from '@/lib/tmdb/service';

export default async function LandingPage() {
  // Fetch trending movies for the day
  const trendingData = await getTrending('movie', 'day');
  const trendingMovies = trendingData.results;

  // Select a random movie for the hero backdrop
  const randomMovie = trendingMovies[Math.floor(Math.random() * trendingMovies.length)];
  const backdropUrl = getBackdropUrl(randomMovie?.backdrop_path);

  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      <Navbar />

      {/* Hero Section with Cinematic Background */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Dynamic Backdrop Image */}
        {backdropUrl && (
          <div className="absolute inset-0">
            <Image
              src={backdropUrl}
              alt={randomMovie.title}
              fill
              className="object-cover scale-110 animate-[scale_20s_ease-in-out_infinite]"
              priority
              quality={90}
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
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-text-secondary">
                Miles de películas al alcance de tu mano
              </span>
            </div>

            {/* Main Heading with Premium Gradient */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in-up delay-100">
              Tu Universo de{' '}
              <span className="text-gradient-premium inline-block">Películas</span>
            </h1>

            <p className="text-xl sm:text-2xl text-text-secondary max-w-3xl mx-auto mb-12 animate-fade-in-up delay-200">
              Descubre, organiza y disfruta de miles de películas.
              <br />
              <span className="text-primary font-semibold">Tu colección personal de películas</span> en un solo lugar.
            </p>

            {/* CTA Buttons with Premium Effects */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
              <Link
                href="/browse"
                className="group relative flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 glow-primary"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10">Explorar Ahora</span>
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

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16 animate-fade-in-up delay-400">
              <div className="card-premium p-4 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">10K+</div>
                <div className="text-sm text-text-secondary">Películas</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">4K</div>
                <div className="text-sm text-text-secondary">En HD</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">24/7</div>
                <div className="text-sm text-text-secondary">Actualizado</div>
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

      {/* Features Section with Premium Cards */}
      <section className="py-24 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/30 to-background" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              ¿Por qué <span className="text-gradient-premium">FilmiFy</span>?
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              La plataforma definitiva para los amantes del cine
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-premium p-8 text-center group hover:scale-105 transition-all duration-300 animate-scale-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl mb-6 group-hover:animate-pulse-glow transition-all">
                <Search className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 group-hover:text-gradient transition-all">
                Búsqueda Inteligente
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Encuentra cualquier película al instante con nuestra potente búsqueda impulsada por IA.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-premium p-8 text-center group hover:scale-105 transition-all duration-300 animate-scale-in delay-100">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl mb-6 group-hover:animate-pulse-glow transition-all">
                <Heart className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 group-hover:text-gradient transition-all">
                Tus Favoritos
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Guarda y organiza tus películas favoritas en listas personalizadas y compártelas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-premium p-8 text-center group hover:scale-105 transition-all duration-300 animate-scale-in delay-200">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/10 rounded-2xl mb-6 group-hover:animate-pulse-glow transition-all">
                <Zap className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 group-hover:text-gradient transition-all">
                Catálogo Infinito
              </h3>
              <p className="text-text-secondary leading-relaxed">
                Accede a miles de películas actualizadas diariamente desde nuestra base de datos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  );
}
