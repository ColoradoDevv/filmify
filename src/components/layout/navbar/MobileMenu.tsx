'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Search, Heart, LogOut } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

import SearchInput from '@/components/features/SearchInput';
import { Clapperboard, Users, Tv } from 'lucide-react';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    user: SupabaseUser | null;
    onLogoutClick: () => void;
}

export default function MobileMenu({ isOpen, onClose, user, onLogoutClick }: MobileMenuProps) {
    const placeholderName = useMemo(() => {
        const fallbackNames = ['Internauta', 'Explorador', 'Cinéfilo', 'Aventurero', 'Navegante', 'Usuario'];
        return fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className="md:hidden glass-effect border-t border-surface-light/50"
            id="mobile-menu"
        >
            <div className="px-4 py-6 space-y-4">
                <div className="rounded-3xl bg-[#11131a] border border-white/10 p-4 shadow-2xl shadow-black/20">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <p className="text-sm text-text-secondary">Hola</p>
                            <p className="text-lg font-semibold text-white">
                                {user?.user_metadata?.full_name || 'Explorador'}
                            </p>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
                            Móvil
                        </span>
                    </div>
                    <p className="text-sm text-text-secondary leading-6">
                        Navega rápido por películas, series y tu contenido favorito desde tu teléfono.
                    </p>
                </div>

                {/* Search Input */}
                <div className="mb-4">
                    <SearchInput className="w-full" placeholder="Buscar películas..." />
                </div>

                {user ? (
                    <>
                        <div className="grid gap-3">
                            <Link
                                href="/browse"
                                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-black font-semibold justify-center transition-all hover:scale-[1.01]"
                                onClick={onClose}
                            >
                                <Clapperboard className="w-5 h-5" />
                                Explorar ahora
                            </Link>
                            <Link
                                href="/profile"
                                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold justify-center transition-all hover:bg-white/10"
                                onClick={onClose}
                            >
                                <Users className="w-5 h-5" />
                                Mi perfil
                            </Link>
                            <Link
                                href="/search"
                                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold justify-center transition-all hover:bg-white/10"
                                onClick={onClose}
                            >
                                <Search className="w-5 h-5" />
                                Buscar contenido
                            </Link>
                        </div>

                        <div className="space-y-2">
                            <Link
                                href="/live-tv"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all focus:outline-none focus:bg-surface/50 text-gray-300 hover:text-white"
                                onClick={onClose}
                            >
                                <Tv className="w-5 h-5 text-primary" />
                                <span className="font-medium">TV en Vivo</span>
                            </Link>
                            <Link
                                href="/favorites"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all focus:outline-none focus:bg-surface/50 text-gray-300 hover:text-white"
                                onClick={onClose}
                            >
                                <Heart className="w-5 h-5 text-accent" />
                                <span className="font-medium">Favoritos</span>
                            </Link>
                        </div>
                        <button
                            onClick={() => {
                                onClose();
                                onLogoutClick();
                            }}
                            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/15 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        >
                            <LogOut className="w-5 h-5" />
                            Cerrar Sesión
                        </button>
                    </>
                ) : (
                    <>
                        <div className="space-y-3">
                            <Link
                                href="/login"
                                className="block px-4 py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-black font-semibold text-center transition-all hover:scale-[1.01]"
                                onClick={onClose}
                            >
                                Iniciar Sesión
                            </Link>
                            <Link
                                href="/register"
                                className="block px-4 py-4 rounded-2xl bg-white/10 border border-white/10 text-white font-semibold text-center transition-all hover:bg-white/20"
                                onClick={onClose}
                            >
                                Registrarse
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
