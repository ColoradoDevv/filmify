'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Heart, Settings, Film } from 'lucide-react';

const navigation = [
    { name: 'Inicio', href: '/browse', icon: Home },
    { name: 'Favoritos', href: '/favorites', icon: Heart },
    { name: 'Ajustes', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-surface border-r border-surface-light">
            <div className="flex flex-col flex-1 min-h-0">
                {/* Logo */}
                <div className="flex items-center gap-2 px-6 py-6 border-b border-surface-light">
                    <Film className="w-8 h-8 text-primary" />
                    <span className="text-2xl font-bold text-gradient">FilmiFy</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-surface-light">
                    <p className="text-xs text-text-muted">
                        © 2024 FilmiFy
                    </p>
                </div>
            </div>
        </aside>
    );
}
