'use client';

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
    if (!isOpen) return null;

    return (
        <div
            className="md:hidden glass-effect border-t border-surface-light/50"
            id="mobile-menu"
        >
            <div className="px-4 py-6 space-y-3">
                {/* Search Input */}
                <div className="mb-4">
                    <SearchInput className="w-full" placeholder="Buscar películas..." />
                </div>

                {user ? (
                    <>
                        <Link
                            href="/browse"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all focus:outline-none focus:bg-surface/50 text-gray-300 hover:text-white"
                            onClick={onClose}
                        >
                            <Clapperboard className="w-5 h-5 text-primary" />
                            <span className="font-medium">Explorar</span>
                        </Link>
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
                        <button
                            onClick={() => {
                                onClose();
                                onLogoutClick();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all text-accent focus:outline-none focus:bg-surface/50"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            href="/login"
                            className="block px-4 py-3 rounded-xl hover:bg-surface/50 transition-all font-medium text-center focus:outline-none focus:bg-surface/50 text-gray-300 hover:text-white"
                            onClick={onClose}
                        >
                            Iniciar Sesión
                        </Link>
                        <Link
                            href="/register"
                            className="block px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            onClick={onClose}
                        >
                            Registrarse
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
