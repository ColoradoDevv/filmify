import Link from 'next/link';
import { ArrowRight, Film, Heart, Search } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Tu Universo de{' '}
              <span className="text-gradient">Cine</span>
            </h1>

            <p className="text-xl sm:text-2xl text-text-secondary max-w-3xl mx-auto mb-12">
              Descubre, organiza y disfruta de miles de películas.
              Tu colección personal de cine en un solo lugar.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/browse"
                className="group flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-hover transition-all hover:scale-105"
              >
                Explorar Ahora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/register"
                className="px-8 py-4 bg-surface text-text-primary rounded-lg font-semibold text-lg hover:bg-surface-hover transition-all border border-surface-light"
              >
                Crear Cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            ¿Por qué <span className="text-gradient">FilmiFy</span>?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Búsqueda Inteligente</h3>
              <p className="text-text-secondary">
                Encuentra cualquier película al instante con nuestra potente búsqueda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-6">
                <Heart className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Tus Favoritos</h3>
              <p className="text-text-secondary">
                Guarda y organiza tus películas favoritas en listas personalizadas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Catálogo Infinito</h3>
              <p className="text-text-secondary">
                Accede a miles de películas actualizadas diariamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-surface-light py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-gradient">FilmiFy</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/contact" className="text-text-secondary hover:text-text-primary transition-colors">
                Contacto
              </Link>
              <Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">
                Iniciar Sesión
              </Link>
            </div>

            <p className="text-text-muted text-sm">
              © 2024 FilmiFy. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
