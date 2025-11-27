import Link from 'next/link';
import { Film, Github, Twitter, Instagram, Mail, Heart, ArrowRight } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative mt-auto">
            {/* Decorative gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/30 to-surface opacity-50" />

            <div className="relative">
                {/* Main Footer Content */}
                <div className="glass-effect border-t border-surface-light/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                            {/* Brand Section */}
                            <div className="lg:col-span-2">
                                <Link href="/" className="flex items-center gap-3 group mb-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl group-hover:bg-primary/30 transition-all" />
                                        <Film className="relative w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-gradient-premium">
                                            FilmiFy
                                        </span>
                                        <span className="text-[10px] text-text-muted -mt-1 tracking-wider uppercase">
                                            Premium Cinema
                                        </span>
                                    </div>
                                </Link>

                                <p className="text-text-secondary leading-relaxed mb-6 max-w-md">
                                    Tu plataforma definitiva para descubrir, organizar y disfrutar del mejor cine.
                                    Miles de películas actualizadas diariamente.
                                </p>

                                {/* Newsletter */}
                                <div className="max-w-md">
                                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-primary" />
                                        Suscríbete al Newsletter
                                    </h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="tu@email.com"
                                            className="flex-1 px-4 py-2.5 bg-surface/50 border border-surface-light/50 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                        <button className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium hover:scale-105 transition-all flex items-center gap-2 group">
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
                                    Enlaces Rápidos
                                </h3>
                                <ul className="space-y-3">
                                    <li>
                                        <Link href="/browse" className="text-text-secondary hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Explorar Películas
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/favorites" className="text-text-secondary hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Mis Favoritos
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/about" className="text-text-secondary hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Acerca de
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/contact" className="text-text-secondary hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Contacto
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal & Social */}
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
                                    Legal & Social
                                </h3>
                                <ul className="space-y-3 mb-6">
                                    <li>
                                        <Link href="/privacy" className="text-text-secondary hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Privacidad
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/terms" className="text-text-secondary hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            Términos de Uso
                                        </Link>
                                    </li>
                                </ul>

                                {/* Social Links */}
                                <div className="flex items-center gap-3">
                                    <a
                                        href="https://github.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-surface/50 border border-surface-light/50 flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-surface transition-all group"
                                    >
                                        <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                    <a
                                        href="https://twitter.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-surface/50 border border-surface-light/50 flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-surface transition-all group"
                                    >
                                        <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                    <a
                                        href="https://instagram.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-surface/50 border border-surface-light/50 flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/50 hover:bg-surface transition-all group"
                                    >
                                        <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="glass-effect border-t border-surface-light/30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-text-muted text-sm">
                                © {currentYear} FilmiFy. Todos los derechos reservados.
                            </p>

                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <span>Hecho con</span>
                                <Heart className="w-4 h-4 text-accent fill-accent animate-pulse" />
                                <span>para los amantes del cine</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
