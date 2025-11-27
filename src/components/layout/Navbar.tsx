'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    return (
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-surface-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <Film className="w-8 h-8 text-primary group-hover:text-primary-hover transition-colors" />
                        <span className="text-2xl font-bold">
                            <span className="text-gradient">FilmiFy</span>
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-4">
                        {!isAuthPage && (
                            <>
                                <Link
                                    href="/browse"
                                    className="text-text-secondary hover:text-text-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface"
                                >
                                    Explorar
                                </Link>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                                >
                                    Iniciar Sesión
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
