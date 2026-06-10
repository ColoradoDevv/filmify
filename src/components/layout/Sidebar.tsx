'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Home, Film, Tv, Radio, BookOpen,
    Heart, Settings, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import { useIsSidebarCollapsed, useToggleSidebar } from '@/lib/store/useStore';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    isActive: (pathname: string, category: string | null) => boolean;
}

interface NavSection {
    title: string | null;
    items: NavItem[];
}

const SECTIONS: NavSection[] = [
    {
        title: null,
        items: [
            {
                name: 'Inicio',
                href: '/',
                icon: Home,
                isActive: (p) => p === '/',
            },
        ],
    },
    {
        title: 'Explorar',
        items: [
            {
                name: 'Películas',
                href: '/browse?category=movie',
                icon: Film,
                isActive: (p, cat) =>
                    p.startsWith('/browse') && (!cat || cat === 'movie'),
            },
            {
                name: 'Series',
                href: '/browse?category=tv',
                icon: Tv,
                isActive: (p, cat) =>
                    p.startsWith('/browse') && cat === 'tv',
            },
            {
                name: 'TV en Vivo',
                href: '/live-tv',
                icon: Radio,
                isActive: (p) => p.startsWith('/live-tv'),
            },
            {
                name: 'Editorial',
                href: '/editorial',
                icon: BookOpen,
                isActive: (p) => p.startsWith('/editorial'),
            },
        ],
    },
    {
        title: 'Mi cuenta',
        items: [
            {
                name: 'Favoritos',
                href: '/favorites',
                icon: Heart,
                isActive: (p) => p.startsWith('/favorites'),
            },
            {
                name: 'Watch Party',
                href: '/watch-party',
                icon: Users,
                isActive: (p) => p.startsWith('/watch-party'),
            },
            {
                name: 'Ajustes',
                href: '/settings',
                icon: Settings,
                isActive: (p) => p.startsWith('/settings'),
            },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isCollapsed = useIsSidebarCollapsed();
    const toggleSidebar = useToggleSidebar();
    const navRef = useRef<HTMLElement>(null);

    const category = searchParams.get('category');

    useSpatialNavigation(navRef, { enabled: true, focusOnMount: false });

    return (
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
                {/* Botón de colapso */}
                <button
                    onClick={toggleSidebar}
                    className={[
                        'absolute -right-3 top-4 w-6 h-6 rounded-full',
                        'bg-surface-container border border-outline-variant',
                        'flex items-center justify-center',
                        'text-on-surface-variant hover:text-on-surface',
                        'transition-all duration-200 shadow-md z-50',
                    ].join(' ')}
                    aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
                    aria-expanded={!isCollapsed}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                    ) : (
                        <ChevronLeft className="w-3 h-3" />
                    )}
                </button>

                {/* Logo */}
                <div
                    className={[
                        'flex items-center py-5 mb-2 transition-all duration-300',
                        isCollapsed ? 'justify-center px-0' : 'px-5 gap-3',
                    ].join(' ')}
                >
                    <Link
                        href="/"
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        aria-label="FilmiFy — Inicio"
                    >
                        {isCollapsed ? (
                            <Image
                                src="/logo-icon.svg"
                                alt="FilmiFy"
                                width={28}
                                height={28}
                                priority
                            />
                        ) : (
                            <Image
                                src="/logo-full.svg"
                                alt="FilmiFy"
                                width={120}
                                height={28}
                                priority
                            />
                        )}
                    </Link>
                </div>

                {/* Navegación principal */}
                <nav
                    ref={navRef}
                    className={[
                        'flex-1 flex flex-col gap-0.5 overflow-y-auto',
                        isCollapsed ? 'px-2' : 'px-3',
                    ].join(' ')}
                    role="navigation"
                    aria-label="Navegación principal"
                >
                    {SECTIONS.map((section, sIdx) => (
                        <div
                            key={section.title ?? `section-${sIdx}`}
                            className="flex flex-col gap-0.5"
                        >
                            {section.title && (
                                isCollapsed ? (
                                    <div className="h-px bg-outline-variant mx-2 my-3" />
                                ) : (
                                    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">
                                        {section.title}
                                    </p>
                                )
                            )}

                            {section.items.map((item) => {
                                const active = item.isActive(
                                    pathname ?? '',
                                    category
                                );
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        aria-label={item.name}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        title={
                                            isCollapsed
                                                ? item.name
                                                : undefined
                                        }
                                        className={[
                                            'group relative flex items-center rounded-full transition-all duration-200',
                                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                            isCollapsed
                                                ? 'justify-center w-full h-10 px-0'
                                                : 'gap-3 px-4 h-10',
                                            active
                                                ? 'bg-secondary-container text-on-secondary-container'
                                                : 'text-on-surface-variant hover:bg-on-surface/8 hover:text-on-surface',
                                        ].join(' ')}
                                    >
                                        <Icon
                                            className={[
                                                'w-[1.125rem] h-[1.125rem] shrink-0 transition-transform duration-200',
                                                active
                                                    ? ''
                                                    : 'group-hover:scale-110',
                                            ].join(' ')}
                                        />

                                        {!isCollapsed && (
                                            <span className="md3-label-large whitespace-nowrap">
                                                {item.name}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer (solo expandido) */}
                {!isCollapsed && (
                    <div className="p-4 mt-auto">
                        <div className="rounded-[var(--radius-lg)] bg-surface-container p-3 border border-outline-variant">
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                                    <span className="text-[9px] font-bold text-on-primary">
                                        PRO
                                    </span>
                                </div>
                                <div>
                                    <p className="md3-label-medium text-on-surface">
                                        FilmiFy Premium
                                    </p>
                                    <p className="md3-label-small text-on-surface-variant">
                                        Próximamente
                                    </p>
                                </div>
                            </div>
                            <p className="md3-label-small text-on-surface-variant/60 text-center pt-2 border-t border-outline-variant">
                                © {new Date().getFullYear()} FilmiFy Inc.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}