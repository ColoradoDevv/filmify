'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rss } from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Portada',   href: '/editorial' },
    { label: 'Noticias',  href: '/editorial/categoria/noticias' },
    { label: 'Streaming', href: '/editorial/categoria/streaming' },
    { label: 'Películas', href: '/editorial/categoria/peliculas' },
    { label: 'Series',    href: '/editorial/categoria/series' },
    { label: 'Premios',   href: '/editorial/categoria/premios' },
    { label: 'Guías',     href: '/editorial/categoria/guias' },
];

export default function EditorialNav() {
    const pathname = usePathname();

    return (
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 pb-0">
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide border-t border-outline-variant/50">
                {NAV_ITEMS.map((item) => {
                    const isActive =
                        item.href === '/editorial'
                            ? pathname === '/editorial'
                            : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex-shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                                isActive
                                    ? 'text-primary border-primary'
                                    : 'text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
                <div className="ml-auto flex-shrink-0 flex items-center gap-1 px-4 py-3 text-xs text-on-surface-variant">
                    <Rss className="w-3 h-3 text-primary" />
                    <span className="hidden sm:block">RSS</span>
                </div>
            </div>
        </nav>
    );
}
