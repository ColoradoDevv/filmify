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
                className={`fixed left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? 'glass-effect shadow-lg shadow-primary/5'
                    : 'bg-background/60 backdrop-blur-md'
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
                                className="h-12 w-auto group-hover:scale-105 transition-transform duration-300"
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            {!loading && !isAuthPage && (
                                <>
                                    {user ? (
                                        <>
                                            {/* Navigation Links */}
                                            <div className="flex items-center gap-2">
                                                {isAdmin && (
                                                    <Link
                                                        href="/admin"
                                                        className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-red-500/50 ${pathname?.startsWith('/admin')
                                                            ? 'text-red-500'
                                                            : 'text-gray-300 hover:text-text-primary'
                                                            }`}
                                                    >
                                                        <span className="relative z-10 flex items-center gap-2">
                                                            <ShieldCheck className="w-4 h-4" />
                                                            Admin
                                                        </span>
                                                        {pathname?.startsWith('/admin') && (
                                                            <div className="absolute inset-0 bg-red-500/10 rounded-xl" />
                                                        )}
                                                        <div className="absolute inset-0 bg-surface/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>
                                                )}
                                                <Link
                                                    href="/browse"
                                                    className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary/50 ${pathname?.startsWith('/browse')
                                                        ? 'text-primary'
                                                        : 'text-gray-300 hover:text-text-primary'
                                                        }`}
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        <Clapperboard className="w-4 h-4" />
                                                        Explorar
                                                    </span>
                                                    {pathname?.startsWith('/browse') && (
                                                        <div className="absolute inset-0 bg-primary/10 rounded-xl" />
                                                    )}
                                                    <div className="absolute inset-0 bg-surface/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>

                                                <Link
                                                    href="/rooms"
                                                    className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary/50 ${pathname?.startsWith('/rooms')
                                                        ? 'text-primary'
                                                        : 'text-gray-300 hover:text-text-primary'
                                                        }`}
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        <Users className="w-4 h-4" />
                                                        Watch Parties
                                                    </span>
                                                    {pathname?.startsWith('/rooms') && (
                                                        <div className="absolute inset-0 bg-primary/10 rounded-xl" />
                                                    )}
                                                    <div className="absolute inset-0 bg-surface/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>

                                                <Link
                                                    href="/live-tv"
                                                    className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary/50 ${pathname?.startsWith('/live-tv')
                                                        ? 'text-primary'
                                                        : 'text-gray-300 hover:text-text-primary'
                                                        }`}
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        <Tv className="w-4 h-4" />
                                                        TV en Vivo
                                                    </span>
                                                    {pathname?.startsWith('/live-tv') && (
                                                        <div className="absolute inset-0 bg-primary/10 rounded-xl" />
                                                    )}
                                                    <div className="absolute inset-0 bg-surface/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>

                                                <Link
                                                    href="/favorites"
                                                    className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-accent/50 ${pathname === '/favorites'
                                                        ? 'text-accent'
                                                        : 'text-gray-300 hover:text-text-primary'
                                                        }`}
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        <Heart className="w-4 h-4" />
                                                        Favoritos
                                                    </span>
                                                    {pathname === '/favorites' && (
                                                        <div className="absolute inset-0 bg-accent/10 rounded-xl" />
                                                    )}
                                                    <div className="absolute inset-0 bg-surface/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            </div>

                                            {/* Search Bar */}
                                            <SearchInput className="w-64" />

                                            {/* Notification Center */}
                                            <NotificationCenter user={user} favorites={favorites} />

                                            {/* User Menu */}
                                            <div className="pl-6 border-l border-surface-light/50">
                                                <UserMenu onLogoutClick={handleLogoutClick} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Link
                                                href="/login"
                                                className="px-5 py-2.5 text-gray-300 hover:text-text-primary transition-all font-medium rounded-xl hover:bg-surface/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                Iniciar Sesión
                                            </Link>
                                            <Link
                                                href="/register"
                                                className="relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    Registrarse
                                                </span>
                                                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
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
