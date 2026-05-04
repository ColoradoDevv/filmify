'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES } from '@/lib/editorial';

export default function EditorialHeader() {
    const pathname = usePathname();

    // Map categories to the ones used in the header in the screenshot
    const navItems = [
        { label: 'PORTADA', href: '/editorial' },
        { label: 'NOTICIAS', href: '/editorial/categoria/noticias' },
        { label: 'STREAMING', href: '/editorial/categoria/streaming' },
        { label: 'PELÍCULAS', href: '/editorial/categoria/peliculas' },
        { label: 'SERIES', href: '/editorial/categoria/series' },
        { label: 'PREMIOS', href: '/editorial/categoria/premios' },
        { label: 'GUÍAS', href: '/editorial/categoria/guias' },
    ];

    return (
        <header className="w-full bg-background border-b border-white/5 pt-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Logo / Branding */}
                <div className="flex flex-col items-center sm:items-start mb-10">
                    <Link href="/editorial" className="flex items-center gap-3 group">
                        <div className="relative w-12 h-12 flex items-center justify-center bg-primary rounded-xl shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)] group-hover:scale-105 transition-transform">
                            <span className="text-white font-black text-3xl italic">F</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-white tracking-tight">FilmiFy</span>
                                <span className="text-3xl font-light text-white/40 tracking-[0.2em] uppercase">Editorial</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-white/30 font-bold tracking-[0.4em] uppercase mt-0.5">
                                <span>Cine</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span>Streaming</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span>Series</span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mb-px">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative px-5 py-4 text-[13px] font-black tracking-[0.15em] uppercase transition-all duration-300 whitespace-nowrap group ${
                                    isActive 
                                        ? 'text-primary' 
                                        : 'text-white/40 hover:text-white/80'
                                }`}
                            >
                                {item.label}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.6)]" />
                                )}
                                {!isActive && (
                                    <div className="absolute bottom-0 left-5 right-5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center opacity-40" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
