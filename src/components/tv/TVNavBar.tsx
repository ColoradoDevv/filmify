'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Search, Heart, Settings, Tv, TrendingUp, Radio } from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Inicio',      href: '/browse',              icon: Home,       exact: true },
    { label: 'Buscar',      href: '/search',              icon: Search },
    { label: 'Tendencias',  href: '/browse?category=trending', icon: TrendingUp },
    { label: 'Series',      href: '/browse?category=tv',  icon: Tv },
    { label: 'TV en Vivo',  href: '/live-tv',             icon: Radio },
    { label: 'Favoritos',   href: '/favorites',           icon: Heart },
    { label: 'Ajustes',     href: '/settings',            icon: Settings },
];

export default function TVNavBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.href.includes('?')) {
            const [path, query] = item.href.split('?');
            const params = new URLSearchParams(query);
            const category = params.get('category');
            return pathname === path && searchParams.get('category') === category;
        }
        if (item.exact) {
            return pathname === item.href && !searchParams.get('category');
        }
        return pathname.startsWith(item.href);
    };

    return (
        <aside
            className="tv-sidebar fixed left-0 top-0 bottom-0 w-20 lg:w-24 flex flex-col bg-surface-container/60 backdrop-blur-2xl border-r border-outline-variant z-50"
            role="navigation"
            aria-label="Navegación TV"
        >
            {/* Logo */}
            <div className="flex items-center justify-center py-6 mb-2">
                <Link
                    href="/browse"
                    className="tv-focusable focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-1 transition-transform hover:scale-110 focus:scale-110"
                    tabIndex={0}
                    data-focusable="true"
                    aria-label="FilmiFy - Inicio"
                >
                    <Image
                        src="/logo-icon.svg"
                        alt="FilmiFy"
                        width={44}
                        height={44}
                        className="w-11 h-11"
                    />
                </Link>
            </div>

            {/* Nav items */}
            <nav className="flex-1 flex flex-col items-center gap-1 px-2 overflow-y-auto scrollbar-hide">
                {NAV_ITEMS.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            tabIndex={0}
                            data-focusable="true"
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                            className={[
                                'group relative w-full flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all duration-200',
                                'tv-focusable focus:outline-none focus:ring-2 focus:ring-primary',
                                active
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-white/50 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/10',
                            ].join(' ')}
                        >
                            {/* Active indicator */}
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                            )}
                            <Icon className={`w-6 h-6 transition-transform group-hover:scale-110 group-focus:scale-110 ${active ? 'text-primary' : ''}`} />
                            <span className="text-[10px] font-medium leading-none text-center">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom hint */}
            <div className="py-4 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-[9px] text-white/30 font-bold">TV</span>
                </div>
            </div>
        </aside>
    );
}
