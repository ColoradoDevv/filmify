import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Film } from 'lucide-react';

export const metadata: Metadata = {
    title: {
        template: '%s | FilmiFy Editorial',
        default: 'FilmiFy Editorial — Guías, reseñas y noticias de cine',
    },
    description: 'Guías de streaming, reseñas de películas, noticias de cine y consejos para disfrutar mejor el entretenimiento en casa.',
};

export default function EditorialLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Editorial Header */}
            <header className="border-b border-outline-variant bg-surface-container/60 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Image src="/logo-icon.svg" alt="FilmiFy" width={32} height={32} className="group-hover:scale-110 transition-transform" />
                        </Link>
                        <div className="w-px h-6 bg-outline-variant" />
                        <Link href="/editorial" className="flex items-center gap-2 hover:text-primary transition-colors">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm tracking-wide">Editorial</span>
                        </Link>
                    </div>
                    <Link
                        href="/browse"
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-sm font-medium transition-all"
                    >
                        <Film className="w-4 h-4" />
                        Ver películas
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main>{children}</main>

            {/* Editorial Footer */}
            <footer className="border-t border-outline-variant mt-20 py-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                        <Image src="/logo-icon.svg" alt="FilmiFy" width={20} height={20} />
                        <span>© {new Date().getFullYear()} FilmiFy Editorial</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/editorial" className="hover:text-primary transition-colors">Artículos</Link>
                        <Link href="/browse" className="hover:text-primary transition-colors">Plataforma</Link>
                        <Link href="/legal" className="hover:text-primary transition-colors">Legal</Link>
                        <Link href="/contact" className="hover:text-primary transition-colors">Contacto</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
