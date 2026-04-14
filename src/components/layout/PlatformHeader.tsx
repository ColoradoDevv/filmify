'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import SearchInput from '@/components/features/SearchInput';
import useFavoritesSync from '@/hooks/useFavoritesSync';

export default function PlatformHeader() {
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const supabase = createClient();

    useFavoritesSync();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
        setProfileMenuOpen(false);
    };

    const confirmLogout = async () => {
        await supabase.auth.signOut();
        setShowLogoutConfirm(false);
        router.refresh();
        router.push('/');
    };

    return (
        <>
            <div
                style={{ top: 'var(--announcement-height, 0px)' }}
                className="sticky z-40 bg-surface border-b border-surface-light px-4 py-4 flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-2 lg:hidden">
                    <span className="text-2xl font-bold text-gradient">FilmiFy</span>
                </div>

                <div className="flex-1 max-w-xl ml-auto flex items-center gap-4 justify-end">
                    <div className="w-full max-w-md">
                        <SearchInput className="w-full" placeholder="Buscar películas, series..." />
                    </div>

                    {user && (
                        <div className="flex items-center gap-3 pl-4 border-l border-surface-light/50 relative">
                            <div
                                className="relative group cursor-pointer tv-focusable focus:outline-none focus:ring-2 focus:ring-primary rounded-xl transition-all"
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setProfileMenuOpen(!profileMenuOpen);
                                    }
                                }}
                                tabIndex={0}
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary border border-primary/20 group-hover:border-primary/40 transition-all">
                                    {user.user_metadata?.avatar_url ? (
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt="Avatar"
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    ) : (
                                        <User className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                            </div>

                            {/* Dropdown Menu */}
                            {profileMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setProfileMenuOpen(false)}
                                    />
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in">
                                        <div className="p-2 space-y-1">
                                            <Link
                                                href="/profile"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-light/50 text-text-secondary hover:text-text-primary transition-colors tv-focusable focus:bg-surface-light/80 focus:outline-none"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                <span className="text-sm font-medium">Ver perfil</span>
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-light/50 text-text-secondary hover:text-text-primary transition-colors tv-focusable focus:bg-surface-light/80 focus:outline-none"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <Settings className="w-4 h-4" />
                                                <span className="text-sm font-medium">Configuración</span>
                                            </Link>
                                            <div className="h-px bg-surface-light/50 my-1" />
                                            <button
                                                onClick={() => {
                                                    setProfileMenuOpen(false);
                                                    handleLogoutClick();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors tv-focusable focus:bg-red-500/20 focus:outline-none"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm font-medium">Cerrar Sesión</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-surface border border-surface-light rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <LogOut className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">¿Cerrar Sesión?</h3>
                            <p className="text-text-secondary mb-6">
                                ¿Estás seguro que deseas salir de tu cuenta? Tendrás que iniciar sesión nuevamente para acceder a tu contenido.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-light hover:bg-surface-light/50 transition-colors font-medium tv-focusable focus:bg-surface-light/80 focus:outline-none"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmLogout}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium tv-focusable focus:bg-red-600 focus:outline-none"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
