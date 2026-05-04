import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Film, Rss, Search } from 'lucide-react';

export const metadata: Metadata = {
    title: {
        template: '%s | FilmiFy Editorial',
        default: 'FilmiFy Editorial — Noticias, guías y reseñas de cine',
    },
    description: 'Las últimas noticias de cine, guías de streaming, reseñas y análisis. Todo sobre películas y series en un solo lugar.',
};

const SECTIONS = [
    { label: 'Noticias',   href: '/editorial/categoria/noticias' },
    { label: 'Streaming',  href: '/editorial/categoria/streaming' },
    { label: 'Películas',  href: '/editorial/categoria/peliculas' },
    { label: 'Series',     href: '/editorial/categoria/series' },
    { label: 'Premios',    href: '/editorial/categoria/premios' },
    { label: 'Guías',      href: '/editorial/categoria/guias' },
];

export default function EditorialLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Masthead ─────────────────────────────────────────────────── */}
            <header className="bg-surface-container-low border-b border-outline-variant">
                {/* Top bar */}
                <div className="border-b border-outline-variant/50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                Actualizado hoy
                            </span>
                            <span className="hidden sm:block">·</span>
                            <span className="hidden sm:block">
                                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/browse"
                                className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
                            >
                                <Film className="w-3.5 h-3.5" />
                                <span className="hidden sm:block">Ver películas</span>
                            </Link>
                            <Link
                                href="/register"
                                className="text-xs px-3 py-1 bg-primary text-on-primary rounded-full font-medium hover:bg-primary-hover transition-colors"
                            >
                                Crear cuenta gratis
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Logo + title */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/editorial" className="flex items-center group">
                        <Image
                            src="/logo-full-editorial.svg"
                            alt="FilmiFy Editorial"
                            width={220}
                            height={48}
                            className="h-10 w-auto group-hover:opacity-90 transition-opacity"
                            priority
                        />
                    </Link>

                    {/* Search hint */}
                    <Link
                        href="/search"
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-full text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface transition-all w-56"
                    >
                        <Search className="w-4 h-4" />
                        <span>Buscar películas...</span>
                    </Link>
                </div>

                {/* Section nav */}
                <nav className="max-w-6xl mx-auto px-4 sm:px-6 pb-0">
                    <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide border-t border-outline-variant/50">
                        <Link
                            href="/editorial"
                            className="flex-shrink-0 px-4 py-3 text-xs font-bold text-primary border-b-2 border-primary uppercase tracking-wider"
                        >
                            Portada
                        </Link>
                        {SECTIONS.map(s => (
                            <Link
                                key={s.href}
                                href={s.href}
                                className="flex-shrink-0 px-4 py-3 text-xs font-medium text-on-surface-variant hover:text-on-surface border-b-2 border-transparent hover:border-outline-variant transition-all uppercase tracking-wider"
                            >
                                {s.label}
                            </Link>
                        ))}
                        <div className="ml-auto flex-shrink-0 flex items-center gap-1 px-4 py-3 text-xs text-on-surface-variant">
                            <Rss className="w-3 h-3 text-primary" />
                            <span className="hidden sm:block">RSS</span>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Content */}
            <main className="min-h-screen">{children}</main>

            {/* Footer */}
            <footer className="bg-surface-container-low border-t border-outline-variant mt-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Image src="/logo-full-editorial.svg" alt="FilmiFy Editorial" width={140} height={30} className="h-7 w-auto" />
                            </div>
                            <p className="text-xs text-on-surface-variant leading-relaxed">
                                Noticias, guías y análisis sobre cine y streaming. Contenido propio y curaduría de las mejores fuentes del sector.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">Secciones</h4>
                            <div className="grid grid-cols-2 gap-1">
                                {SECTIONS.map(s => (
                                    <Link key={s.href} href={s.href} className="text-xs text-on-surface-variant hover:text-primary transition-colors py-0.5">
                                        {s.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">FilmiFy</h4>
                            <div className="space-y-1">
                                <Link href="/browse" className="block text-xs text-on-surface-variant hover:text-primary transition-colors py-0.5">Ver películas y series</Link>
                                <Link href="/register" className="block text-xs text-on-surface-variant hover:text-primary transition-colors py-0.5">Crear cuenta gratis</Link>
                                <Link href="/legal" className="block text-xs text-on-surface-variant hover:text-primary transition-colors py-0.5">Aviso legal</Link>
                                <Link href="/contact" className="block text-xs text-on-surface-variant hover:text-primary transition-colors py-0.5">Contacto</Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-outline-variant pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
                        <span>© {new Date().getFullYear()} FilmiFy. Todos los derechos reservados.</span>
                        <span>Las noticias externas enlazan a sus fuentes originales con atribución completa.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
