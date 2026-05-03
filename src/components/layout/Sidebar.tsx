'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Heart, Settings, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useIsSidebarCollapsed, useToggleSidebar } from '@/lib/store/useStore';
import { useRef } from 'react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

const navigation = [
    { name: 'Inicio',       href: '/browse',       icon: Home },
    { name: 'Watch Party',  href: '/watch-party',  icon: Users },
    { name: 'Favoritos',    href: '/favorites',    icon: Heart },
    { name: 'Ajustes',      href: '/settings',     icon: Settings },
];

export default function Sidebar() {
    const pathname     = usePathname();
    const router       = useRouter();
    const isCollapsed  = useIsSidebarCollapsed();
    const toggleSidebar = useToggleSidebar();
    const navRef       = useRef<HTMLElement>(null);

    useSpatialNavigation(navRef, { enabled: true, focusOnMount: false });

    const handleNavKeyDown = (e: React.KeyboardEvent, href: string) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(href); }
    };

    return (
        /* MD3 Navigation Rail (collapsed) / Navigation Drawer (expanded) */
        <aside
            style={{ top: 'var(--announcement-height, 0px)' }}
            className={[
                'hidden lg:flex lg:flex-col lg:fixed lg:bottom-0 z-50',
                'bg-surface-container-low border-r border-outline-variant',
                'transition-all duration-300',
                isCollapsed ? 'lg:w-[72px]' : 'lg:w-56',
            ].join(' ')}
        >
            <div className="flex flex-col flex-1 min-h-0">

                {/* Collapse toggle — MD3 icon button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors shadow-[var(--shadow-1)] z-50"
                    aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
                >
                    {isCollapsed
                        ? <ChevronRight className="w-3 h-3" />
                        : <ChevronLeft  className="w-3 h-3" />}
                </button>

                {/* Logo */}
                <div className={[
                    'flex items-center py-5 mb-2 transition-all duration-300',
                    isCollapsed ? 'justify-center px-0' : 'px-5 gap-3',
                ].join(' ')}>
                    <Link
                        href="/browse"
                        className="flex items-center justify-center focus:outline-none"
                        onKeyDown={(e) => handleNavKeyDown(e, '/browse')}
                        aria-label="FilmiFy — Inicio"
                    >
                        <img
                            src="/logo-full.svg"
                            alt="FilmiFy"
                            className={`h-7 w-auto transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`}
                        />
                        <img
                            src="/logo-icon.svg"
                            alt="FilmiFy"
                            className={`h-7 w-7 transition-all duration-300 ${isCollapsed ? 'block' : 'hidden'}`}
                        />
                    </Link>
                </div>

                {/* Navigation — MD3 Navigation Rail items */}
                <nav
                    ref={navRef}
                    className={['flex-1 flex flex-col gap-0.5', isCollapsed ? 'px-2' : 'px-3'].join(' ')}
                    role="navigation"
                    aria-label="Navegación principal"
                >
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onKeyDown={(e) => handleNavKeyDown(e, item.href)}
                                aria-label={item.name}
                                aria-current={isActive ? 'page' : undefined}
                                className={[
                                    /* MD3 Navigation Rail item */
                                    'group relative flex items-center rounded-full transition-all duration-200',
                                    'focus:outline-none',
                                    isCollapsed
                                        ? 'justify-center w-full h-10 px-0'
                                        : 'gap-3 px-4 h-10',
                                    isActive
                                        ? 'bg-secondary-container text-on-secondary-container'
                                        : 'text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface',
                                ].join(' ')}
                            >
                                <Icon className={[
                                    'w-[1.125rem] h-[1.125rem] shrink-0 transition-transform duration-200',
                                    isActive ? 'text-on-secondary-container' : 'group-hover:scale-110',
                                ].join(' ')} />

                                {!isCollapsed && (
                                    <span className="md3-label-large whitespace-nowrap">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                {!isCollapsed && (
                    <div className="p-4 mt-auto">
                        <div className="rounded-[var(--radius-lg)] bg-surface-container p-3 border border-outline-variant">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                                    <span className="text-[9px] font-bold text-on-primary">PRO</span>
                                </div>
                                <div>
                                    <p className="md3-label-medium text-on-surface">FilmiFy Premium</p>
                                    <p className="md3-label-small text-on-surface-variant">Próximamente</p>
                                </div>
                            </div>
                            <p className="md3-label-small text-on-surface-variant/60 text-center pt-2 border-t border-outline-variant">
                                © 2025 FilmiFy Inc.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
