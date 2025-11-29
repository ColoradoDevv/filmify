'use client';

import Link from 'next/link';
import { Search, Heart, LogOut } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

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
                {user ? (
                    <>
                        <Link
                            href="/browse"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all focus:outline-none focus:bg-surface/50"
                            onClick={onClose}
                        >
                            <Search className="w-5 h-5 text-primary" />
                            <span className="font-medium">Explorar</span>
                        </Link>
                        <Link
                            href="/favorites"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all focus:outline-none focus:bg-surface/50"
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
                            className="block px-4 py-3 rounded-xl hover:bg-surface/50 transition-all font-medium text-center focus:outline-none focus:bg-surface/50"
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
