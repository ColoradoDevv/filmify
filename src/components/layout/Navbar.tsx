'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Clapperboard, Heart, Sparkles, LogOut, ShieldCheck, Users, Tv } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser, SupabaseClient, Session } from '@supabase/supabase-js';
import { useFavorites } from '@/lib/store/useStore';
import SearchInput from '@/components/features/SearchInput';
import UserMenu from './navbar/UserMenu';
import NotificationCenter from './navbar/NotificationCenter';
import MobileMenu from './navbar/MobileMenu';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const favorites = useFavorites();
    let supabase: SupabaseClient | undefined;

    try {
        supabase = createClient();
    } catch (error) {
        console.error('Failed to create Supabase client:', error);
        // En desarrollo, continuar sin Supabase
        if (process.env.NODE_ENV === 'development') {
            console.warn('Continuing without Supabase. Please configure your .env.local file.');
        }
    }

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        const getUser = async () => {
            if (!supabase) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user && supabase) {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', user.id)
                            .single();

                        // Check if user has admin privileges
                        if (profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'superadmin') {
                            setIsAdmin(true);
                        }
                    } catch (profileError) {
                        console.error('Error fetching profile:', profileError);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error('Error getting user:', error);
                setLoading(false);
            }
        };

        getUser();

        if (!supabase) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
            setUser(session?.user ?? null);
            if (session?.user && supabase) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    if (profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'superadmin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error('Error fetching profile on auth change:', error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
        setMobileMenuOpen(false);
    };

    const confirmLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setShowLogoutConfirm(false);
        router.refresh();
        router.push('/');
    };

    return (
        <>
            <nav
                style={{ top: 'var(--announcement-height, 0px)' }}
                className={`fixed left-0 right-0 z-50 transition-all duration-500 ${scrolled
                    ? 'bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50'
                    : 'bg-transparent'
                    }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="flex items-center gap-2 group relative z-50"
                            aria-label="Ir al inicio"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <img
                                src="/logo-full.svg"
                                alt="FilmiFy Logo"
                                className="h-10 w-auto transition-all duration-300 group-hover:brightness-110"
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6">
                            {!loading && !isAuthPage && (
                                <>
                                    {user ? (
                                        <>
                                            {/* Navigation Links */}
                                            <div className="flex items-center gap-1">
                                                {isAdmin && (
                                                    <Link
                                                        href="/admin"
                                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pathname?.startsWith('/admin')
                                                            ? 'bg-red-500/10 text-red-500'
                                                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        Admin
                                                    </Link>
                                                )}
                                                <Link
                                                    href="/browse"
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pathname?.startsWith('/browse')
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    Explorar
                                                </Link>


                                                <Link
                                                    href="/live-tv"
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pathname?.startsWith('/live-tv')
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    TV en Vivo
                                                </Link>

                                                <Link
                                                    href="/favorites"
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pathname === '/favorites'
                                                        ? 'bg-accent/10 text-accent'
                                                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    Favoritos
                                                </Link>
                                            </div>

                                            {/* Search Bar */}
                                            <div className="h-8 w-px bg-white/10 mx-2" />
                                            <SearchInput className="w-64" />

                                            {/* Notification Center */}
                                            <NotificationCenter user={user} favorites={favorites} />

                                            {/* User Menu */}
                                            <div className="pl-4 border-l border-white/10">
                                                <UserMenu onLogoutClick={handleLogoutClick} avatarUrl={user.user_metadata?.avatar_url} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <Link
                                                href="/login"
                                                className="text-sm font-medium text-text-secondary hover:text-white transition-colors"
                                            >
                                                Iniciar Sesión
                                            </Link>
                                            <Link
                                                href="/register"
                                                className="px-6 py-2.5 rounded-full bg-primary text-black font-bold text-sm hover:bg-primary-hover hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/20"
                                            >
                                                Comenzar Gratis
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-text-primary hover:bg-surface/50 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="mobile-menu"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <MobileMenu
                    isOpen={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                    user={user}
                    onLogoutClick={handleLogoutClick}
                />
            </nav>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="logout-title">
                    <div className="bg-surface border border-surface-light rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <LogOut className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 id="logout-title" className="text-xl font-bold mb-2">¿Cerrar Sesión?</h3>
                            <p className="text-gray-300 mb-6">
                                ¿Estás seguro que deseas salir de tu cuenta? Tendrás que iniciar sesión nuevamente para acceder a tu contenido.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-light hover:bg-surface-light/50 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-surface-light"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmLogout}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
