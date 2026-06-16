'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Clapperboard, Heart, User, Tv, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';

const supabase = createClient();

interface Tab {
    name: string;
    icon: LucideIcon;
    href: string;
    isActive: (path: string, category: string | null) => boolean;
}

/**
 * Bottom tab bar — navegación principal en móvil/tablet.
 *
 * Mobile-first: es la forma estándar de navegar en apps de streaming y la más
 * cómoda con el pulgar. Visible solo en pantallas pequeñas (oculta en lg+,
 * donde el Sidebar toma el relevo). Respeta el safe-area de iOS.
 */
export default function MobileTabBar() {
    const pathname = usePathname() ?? '';
    const category = useSearchParams().get('category');
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }: { data: { user: SupabaseUser | null } }) =>
            setLoggedIn(!!data.user),
        );
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_e: AuthChangeEvent, session: Session | null) => setLoggedIn(!!session?.user),
        );
        return () => subscription.unsubscribe();
    }, []);

    // No mostrar la barra en el reproductor a pantalla completa ni en auth.
    const hiddenOn = ['/login', '/register', '/forgot-password', '/reset-password', '/confirm-email', '/watch-party/'];
    if (hiddenOn.some((p) => pathname.startsWith(p))) return null;

    const tabs: Tab[] = [
        { name: 'Inicio', icon: Home, href: '/', isActive: (p) => p === '/' },
        { name: 'Películas', icon: Clapperboard, href: '/browse', isActive: (p, cat) => (p.startsWith('/browse') && cat !== 'tv') || p.startsWith('/genero') },
        ...(loggedIn
            ? [
                { name: 'Favoritos', icon: Heart, href: '/favorites', isActive: (p: string) => p.startsWith('/favorites') },
                { name: 'Cuenta', icon: User, href: '/settings', isActive: (p: string) => p.startsWith('/settings') || p.startsWith('/profile') },
            ]
            : [
                { name: 'Series', icon: Tv, href: '/browse?category=tv', isActive: (p: string, cat: string | null) => p.startsWith('/browse') && cat === 'tv' },
                { name: 'Watch Party', icon: Users, href: '/watch-party', isActive: (p: string) => p.startsWith('/watch-party') },
            ]),
    ];

    return (
        <>
            {/* Spacer para que el contenido no quede tapado por la barra fija */}
            <div className="lg:hidden h-[calc(4rem+env(safe-area-inset-bottom))]" aria-hidden />

            <nav
                aria-label="Navegación principal"
                className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant pb-[env(safe-area-inset-bottom)]"
            >
                <ul className="flex items-stretch justify-around h-16 px-1 list-none m-0">
                    {tabs.map((tab) => {
                        const active = tab.isActive(pathname, category);
                        const Icon = tab.icon;
                        return (
                            <li key={tab.name} className="flex-1">
                                <Link
                                    href={tab.href}
                                    aria-label={tab.name}
                                    aria-current={active ? 'page' : undefined}
                                    className={[
                                        'h-full flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors',
                                        // Área táctil cómoda (≥48px de alto, todo el ancho de la celda)
                                        'active:bg-white/5',
                                        active ? 'text-primary' : 'text-on-surface-variant',
                                    ].join(' ')}
                                >
                                    <Icon
                                        className={`w-[22px] h-[22px] ${active ? 'fill-primary/15' : ''}`}
                                        strokeWidth={active ? 2.4 : 2}
                                    />
                                    <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                                        {tab.name}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}
