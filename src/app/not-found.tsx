import Link from 'next/link';
import { Home, Film, Clapperboard, ArrowRight } from 'lucide-react';

/**
 * Custom 404 Not Found Page
 * Displays when users navigate to non-existent routes
 * Maintains FilmiFy's premium dark mode design and brand consistency
 */

export default function NotFound() {
    return (
        <main className="min-h-screen bg-background flex items-center justify-center overflow-hidden relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float" />
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-accent rounded-full animate-float delay-200" />
                <div className="absolute bottom-1/3 left-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-float delay-300" />
                <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-accent rounded-full animate-float delay-500" />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center z-10">
                {/* Decorative Film Icon */}
                <div className="flex justify-center mb-8 animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                        <div className="relative inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full border border-primary/30">
                            <Clapperboard className="w-16 h-16 text-primary animate-float" />
                        </div>
                    </div>
                </div>

                {/* 404 Title */}
                <h1 className="text-8xl sm:text-9xl font-bold mb-6 animate-fade-in-up delay-100">
                    <span className="text-gradient-premium">404</span>
                </h1>

                {/* Error Message */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 animate-fade-in-up delay-200">
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
        </main>
    );
}
