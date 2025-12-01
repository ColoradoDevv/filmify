'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, Twitter, Instagram, Mail, Heart, ArrowRight, Check, Loader2 } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('success');
        setEmail('');

        // Reset status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
    };

    return (
        <footer className="relative mt-auto border-t border-surface-light/30">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl -z-10" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="lg:col-span-5 space-y-6">
                        <Link href="/" className="inline-block group">
                            <img
                                src="/logo-full.svg"
                                alt="FilmiFy Logo"
                                className="h-10 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                        </Link>
                        <p className="text-text-secondary leading-relaxed max-w-md text-sm">
                            Tu destino premium para el cine. Descubre, organiza y vive la experiencia del séptimo arte con nuestra plataforma impulsada por IA.
                        </p>

                        {/* Newsletter */}
                        <div className="pt-4">
                            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" />
                                Newsletter Semanal
                            </h3>
                            <form onSubmit={handleSubscribe} className="max-w-sm relative">
                                <div className="relative group">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        disabled={status === 'loading' || status === 'success'}
                                        className="w-full bg-surface/50 border border-surface-light rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={status === 'loading' || status === 'success' || !email}
                                        className="absolute right-1.5 top-1.5 p-1.5 bg-surface-light/50 hover:bg-primary text-text-secondary hover:text-white rounded-lg transition-all disabled:opacity-0 disabled:cursor-not-allowed"
                                    >
                                        {status === 'loading' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : status === 'success' ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                {status === 'success' && (
                                    <p className="absolute -bottom-6 left-0 text-xs text-green-500 flex items-center gap-1 animate-fade-in-up">
                                        <Check className="w-3 h-3" /> ¡Suscrito correctamente!
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Links Sections */}
                    <div className="lg:col-span-2 md:col-span-1">
                        <h4 className="font-semibold text-white mb-6">Explorar</h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link href="/browse" className="text-text-secondary hover:text-primary transition-colors">Películas</Link></li>
                            <li><Link href="/trending" className="text-text-secondary hover:text-primary transition-colors">Tendencias</Link></li>
                            <li><Link href="/new" className="text-text-secondary hover:text-primary transition-colors">Estrenos</Link></li>
                            <li><Link href="/collections" className="text-text-secondary hover:text-primary transition-colors">Colecciones</Link></li>
                        </ul>
                    </div>

                    <div className="lg:col-span-2 md:col-span-1">
                        <h4 className="font-semibold text-white mb-6">Comunidad</h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link href="/about" className="text-text-secondary hover:text-primary transition-colors">Nosotros</Link></li>
                            <li><Link href="/blog" className="text-text-secondary hover:text-primary transition-colors">Blog</Link></li>
                            <li><Link href="/forum" className="text-text-secondary hover:text-primary transition-colors">Foro</Link></li>
                            <li><Link href="/contact" className="text-text-secondary hover:text-primary transition-colors">Contacto</Link></li>
                        </ul>
                    </div>

                    <div className="lg:col-span-3">
                        <h4 className="font-semibold text-white mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm mb-8">
                            <li><Link href="/legal/privacy" className="text-text-secondary hover:text-primary transition-colors">Privacidad</Link></li>
                            <li><Link href="/legal/terms" className="text-text-secondary hover:text-primary transition-colors">Términos</Link></li>
                            <li><Link href="/legal/cookies" className="text-text-secondary hover:text-primary transition-colors">Cookies</Link></li>
                        </ul>

                        <div className="flex gap-4">
                            <SocialLink href="https://github.com" icon={<Github className="w-5 h-5" />} />
                            <SocialLink href="https://twitter.com" icon={<Twitter className="w-5 h-5" />} />
                            <SocialLink href="https://instagram.com" icon={<Instagram className="w-5 h-5" />} />
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-surface-light/30 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <p className="text-xs text-text-muted">
                            © {currentYear} FilmiFy. Todos los derechos reservados.
                        </p>
                        <Link href="/security" className="opacity-80 hover:opacity-100 transition-opacity">
                            <img
                                src="https://img.shields.io/badge/Security-Audited%20Nov%202025-00ff00?style=flat-square"
                                alt="Security Audited"
                                className="h-5"
                            />
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>Hecho con</span>
                        <Heart className="w-3 h-3 text-accent fill-accent animate-pulse" />
                        <span>en el mundo digital</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl bg-surface-light/30 border border-surface-light/50 flex items-center justify-center text-text-secondary hover:bg-surface-light hover:text-white hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
        >
            {icon}
        </a>
    );
}
