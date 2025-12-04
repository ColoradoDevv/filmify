'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Heart, Settings, Film, Search, TrendingUp } from 'lucide-react';
import { useRef } from 'react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

const navigation = [
    { name: 'Inicio', href: '/browse', icon: Home, exact: true },
    { name: 'Buscar', href: '/search', icon: Search },
    { name: 'Tendencias', href: '/browse?category=trending', icon: TrendingUp },
    { name: 'Salas', href: '/rooms', icon: Film },
    { name: 'Favoritos', href: '/favorites', icon: Heart },
    { name: 'Ajustes', href: '/settings', icon: Settings },
];

export default function TVSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const navRef = useRef<HTMLElement>(null);

    // Enable spatial navigation for sidebar
    useSpatialNavigation(navRef, {
        enabled: true,
        focusOnMount: false
    });

    const handleNavKeyDown = (e: React.KeyboardEvent, href: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push(href);
        }
    };

    const isItemActive = (item: typeof navigation[0]) => {
        // Handle items with query params (like Trending)
        if (item.href.includes('?')) {
            const [path, query] = item.href.split('?');
            const params = new URLSearchParams(query);
            const category = params.get('category');

            return pathname === path && searchParams.get('category') === category;
        }

        // Handle exact matches (like Home)
        if (item.exact) {
            // Only active if no category param is present (unless it's the default view)
            return pathname === item.href && !searchParams.get('category');
        }

        // Handle other routes
        return pathname.startsWith(item.href);
    };

    return (
        <aside
            style={{ top: 'var(--announcement-height, 0px)' }}
            className="tv-sidebar hidden lg:flex lg:flex-col lg:fixed lg:bottom-0 lg:w-24 bg-surface/40 backdrop-blur-xl border-r border-white/10 z-50"
        >
            <div className="flex flex-col flex-1 min-h-0 relative">
                {/* Logo */}
                <div className="flex items-center justify-center py-8 mb-4">
                    <Link
                        href="/browse"
                        className="relative group flex items-center justify-center tv-focusable focus:outline-none"
                        tabIndex={0}
                        onKeyDown={(e) => handleNavKeyDown(e, '/browse')}
                        data-focusable="true"
                    >
                        <img
                            src="/logo-icon.svg"
                            alt="FilmiFy"
                            className="h-12 w-12 transition-all duration-300 group-hover:scale-110 group-focus:scale-110"
                        />
                    </Link>
                </div>

                {/* Navigation */}
                <nav ref={navRef} className="flex-1 px-3 space-y-3" role="navigation" aria-label="Navegación principal">
                    {navigation.map((item) => {
                        const isActive = isItemActive(item);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onKeyDown={(e) => handleNavKeyDown(e, item.href)}
                                className={`group relative flex flex-col items-center justify-center py-4 rounded-2xl transition-all duration-300 overflow-hidden tv-focusable focus:outline-none ${isActive
                                    ? 'text-white bg-primary/20 shadow-lg shadow-primary/20'
                                    : 'text-text-secondary hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5'
                                    }`}
                                title={item.name}
                                tabIndex={0}
                                data-focusable="true"
                                aria-label={item.name}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 border border-primary/30 rounded-2xl" />
                                )}

                                <Icon className={`w-7 h-7 relative z-10 transition-all duration-300 mb-1 ${isActive
                                    ? 'scale-110 text-primary'
                                    : 'group-hover:scale-110 group-hover:text-primary group-focus:scale-110 group-focus:text-primary'
                                    }`} />

                                <span className={`text-[10px] font-medium relative z-10 tracking-wide ${isActive ? 'font-bold text-primary' : ''
                                    }`}>
                                    {item.name}
                                </span>

                                {isActive && (
                                    <div className="absolute bottom-2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(0,194,255,0.8)] animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer - User Profile or Premium Badge */}
                <div className="p-4 mt-auto">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg mb-2">
                            <span className="text-xs font-bold text-white">TV</span>
                        </div>
                        <p className="text-[9px] text-text-muted text-center">
                            Modo TV
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
