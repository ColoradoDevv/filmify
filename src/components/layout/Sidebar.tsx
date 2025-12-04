'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Heart, Settings, Film, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsSidebarCollapsed, useToggleSidebar } from '@/lib/store/useStore';
import { useRef } from 'react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

const navigation = [
    { name: 'Inicio', href: '/browse', icon: Home },
    { name: 'Favoritos', href: '/favorites', icon: Heart },
    { name: 'Ajustes', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const isCollapsed = useIsSidebarCollapsed();
    const toggleSidebar = useToggleSidebar();
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

    return (
        <aside
            style={{ top: 'var(--announcement-height, 0px)' }}
            className={`hidden lg:flex lg:flex-col lg:fixed lg:bottom-0 bg-surface/30 backdrop-blur-xl border-r border-white/10 z-50 transition-all duration-300 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'
                }`}
        >
            <div className="flex flex-col flex-1 min-h-0 relative">
                {/* Ambient Background Glow */}
                <div className="absolute top-0 left-0 w-full h-64 bg-primary/20 blur-[100px] -z-10 opacity-50 pointer-events-none" />

                {/* Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSidebar();
                        }
                    }}
                    className="absolute -right-3 top-8 w-6 h-6 bg-surface border border-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white hover:bg-surface-hover transition-colors shadow-lg z-50 tv-focusable focus:outline-none"
                    tabIndex={0}
                    data-focusable="true"
                    aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
                >
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>

                {/* Logo */}
                <div className={`flex items-center gap-3 py-8 mb-4 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-8'}`}>
                    <Link
                        href="/browse"
                        className="relative group flex items-center justify-center tv-focusable focus:outline-none"
                        tabIndex={0}
                        onKeyDown={(e) => handleNavKeyDown(e, '/browse')}
                        data-focusable="true"
                    >
                        {/* Full Logo */}
                        <img
                            src="/logo-full.svg"
                            alt="FilmiFy Logo"
                            className={`h-10 w-auto transition-all duration-300 ${isCollapsed ? 'hidden' : 'block group-hover:scale-105 group-focus:scale-105'}`}
                        />
                        {/* Icon Logo */}
                        <img
                            src="/logo-icon.svg"
                            alt="FilmiFy Icon"
                            className={`h-8 w-8 transition-all duration-300 ${isCollapsed ? 'block group-hover:scale-110 group-focus:scale-110' : 'hidden'}`}
                        />
                    </Link>
                </div>

                {/* Navigation */}
                <nav ref={navRef} className="flex-1 px-3 space-y-2" role="navigation" aria-label="Navegación principal">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onKeyDown={(e) => handleNavKeyDown(e, item.href)}
                                className={`group relative flex items-center py-4 rounded-xl transition-all duration-300 overflow-hidden tv-focusable focus:outline-none ${isActive
                                    ? 'text-white shadow-lg shadow-primary/20'
                                    : 'text-text-secondary hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5'
                                    } ${isCollapsed ? 'justify-center px-2 gap-0' : 'px-5 gap-4'}`}
                                title={isCollapsed ? item.name : undefined}
                                tabIndex={0}
                                data-focusable="true"
                                aria-label={item.name}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/20 rounded-xl" />
                                )}

                                <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-primary' : 'group-hover:scale-110 group-hover:text-primary group-focus:scale-110 group-focus:text-primary'
                                    }`} />

                                <span className={`font-medium relative z-10 tracking-wide whitespace-nowrap transition-all duration-300 ${isActive ? 'font-semibold' : ''
                                    } ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                                    {item.name}
                                </span>

                                {isActive && !isCollapsed && (
                                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-6 mt-auto overflow-hidden">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm transition-all duration-300 ${isCollapsed ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'
                        }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-xs font-bold text-white">PRO</span>
                            </div>
                            <div className="whitespace-nowrap">
                                <p className="text-sm font-semibold text-white">FilmiFy Premium</p>
                                <p className="text-xs text-text-secondary">Próximamente</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-text-muted text-center mt-2 pt-2 border-t border-white/5 whitespace-nowrap">
                            © 2025 FilmiFy Inc.
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
