'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import SearchInput from '@/components/features/SearchInput';
import NotificationCenter from '@/components/layout/navbar/NotificationCenter';
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

    const handleLogoutClick = () => { setShowLogoutConfirm(true); setProfileMenuOpen(false); };
    const confirmLogout = async () => {
        await supabase.auth.signOut();
        setShowLogoutConfirm(false);
        router.refresh();
        router.push('/');
    };

    return (
        <>
            {/* MD3 Top App Bar — small variant, 56px height */}
            <div
                style={{ top: 'var(--announcement-height, 0px)' }}
                className="sticky z-40 h-14 bg-surface-container-low border-b border-outline-variant px-4 flex items-center justify-between gap-3"
            >
                {/* Mobile logo */}
                <div className="flex items-center gap-2 lg:hidden">
                    <img src="/logo-icon.svg" alt="FilmiFy" className="h-6 w-6" />
                    <span className="md3-title-large text-on-surface font-medium">FilmiFy</span>
                </div>

                {/* Search — takes remaining space */}
                <div className="flex-1 max-w-sm ml-auto">
                    <SearchInput className="w-full" placeholder="Buscar…" />
                </div>

                {/* Actions */}
                {user && (
                    <div className="flex items-center gap-1 relative">
                        <NotificationCenter user={user} />

                        {/* Avatar button — MD3 icon button */}
                        <button
                            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setProfileMenuOpen(!profileMenuOpen);
                                }
                            }}
                            className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-outline-variant hover:border-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Menú de usuario"
                            aria-expanded={profileMenuOpen}
                        >
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-primary-container flex items-center justify-center">
                                    <User className="w-4 h-4 text-on-primary-container" />
                                </div>
                            )}
                            {/* Online indicator */}
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#10b981] rounded-full border border-surface-container-low" />
                        </button>

                        {/* MD3 Menu */}
                        {profileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                <div className="absolute top-full right-0 mt-1 w-44 bg-surface-container rounded-[var(--radius-lg)] border border-outline-variant shadow-[var(--shadow-3)] overflow-hidden z-50 animate-scale-in">
                                    <div className="py-1">
                                        <Link
                                            href="/profile"
                                            onClick={() => setProfileMenuOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 md3-label-large text-on-surface hover:bg-on-surface/8 transition-colors"
                                        >
                                            <User className="w-[1.125rem] h-[1.125rem] text-on-surface-variant" />
                                            Ver perfil
                                        </Link>
                                        <Link
                                            href="/settings"
                                            onClick={() => setProfileMenuOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 md3-label-large text-on-surface hover:bg-on-surface/8 transition-colors"
                                        >
                                            <Settings className="w-[1.125rem] h-[1.125rem] text-on-surface-variant" />
                                            Configuración
                                        </Link>
                                        <div className="h-px bg-outline-variant mx-3 my-1" />
                                        <button
                                            onClick={handleLogoutClick}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 md3-label-large text-error hover:bg-error/8 transition-colors"
                                        >
                                            <LogOut className="w-[1.125rem] h-[1.125rem]" />
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* MD3 Dialog — logout confirmation */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface-container rounded-[var(--radius-xl)] p-6 max-w-xs w-full shadow-[var(--shadow-5)] animate-scale-in">
                        <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center mb-4">
                            <LogOut className="w-5 h-5 text-on-error-container" />
                        </div>
                        <h3 className="md3-headline-small text-on-surface mb-1">¿Cerrar sesión?</h3>
                        <p className="md3-body-medium text-on-surface-variant mb-6">
                            Tendrás que iniciar sesión nuevamente para acceder a tu contenido.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="h-10 px-6 rounded-full md3-label-large text-primary hover:bg-primary/8 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="h-10 px-6 rounded-full md3-label-large bg-error-container text-on-error-container hover:shadow-[var(--shadow-1)] transition-shadow"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
