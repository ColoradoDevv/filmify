import Link from 'next/link';
import HeroPosterCollage from '@/components/features/HeroPosterCollage';
import Image from 'next/image';
import { Home, Film, ArrowRight } from 'lucide-react';

export default async function NotFound() {
  let posters: string[] = [];

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}&language=es-ES`,
      { next: { revalidate: 3600 } } // se actualiza cada hora
    );
    const data = await res.json();
    posters = (data.results ?? [])
      .map((movie: any) => movie.poster_path)
      .filter(Boolean);
  } catch {
    // Si la API falla, posters queda vacío → HeroPosterCollage mostrará el gradiente
    console.error('No se pudieron cargar las películas en tendencia para la página 404.');
  }

  return (
    <HeroPosterCollage
      posters={posters}
      repeat={true}
      className="min-h-screen bg-background flex items-center justify-center overflow-hidden relative"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-accent rounded-full animate-float delay-200" />
        <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-float delay-300" />
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-accent rounded-full animate-float delay-500" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center z-10">
        {/* Logo de FilmiFy */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full border border-primary/30">
              <Image
                src="/logo-icon.svg"
                alt="FilmiFy"
                width={64}
                height={64}
                className="w-16 h-16 animate-float"
              />
            </div>
          </div>
        </div>

        {/* 404 Title */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 animate-fade-in-up delay-100">
          <span className="text-gradient-premium">404</span>
        </h1>

        {/* Error Message */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 animate-fade-in-up delay-200">
          ¡Escena No Encontrada!
        </h2>

        <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-300">
          Parece que esta página se perdió en el montaje final.
          <br />
          <span className="text-text-muted">
            La URL que buscas no existe o fue eliminada.
          </span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-400">
          <Link
            href="/"
            className="group relative flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 glow-primary"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Home className="relative z-10 w-5 h-5" />
            <span className="relative z-10">Volver al Inicio</span>
            <div className="absolute inset-0 animate-shimmer" />
          </Link>

          <Link
            href="/browse"
            className="group flex items-center gap-2 px-8 py-4 glass-effect text-text-primary rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 border border-surface-light/50 hover:border-primary/50"
          >
            <Film className="w-5 h-5" />
            <span>Explorar Películas</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </HeroPosterCollage>
  );
}