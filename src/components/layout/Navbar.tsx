'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, LogOut, User, Menu, X, Search, Heart, Settings, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const supabase = createClient();

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
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
        await supabase.auth.signOut();
        setShowLogoutConfirm(false);
        router.refresh();
        router.push('/');
    };

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'glass-effect shadow-lg shadow-primary/5'
                : 'bg-background/60 backdrop-blur-md'
                }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group relative">
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
                                                <Link
                                                    href="/browse"
                                                    className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group ${pathname === '/browse'
                                                        ? 'text-primary'
                                                        : 'text-text-secondary hover:text-text-primary'
                                                        }`}
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        <Search className="w-4 h-4" />
                                                        Explorar
                                                    </span>
                                                    {pathname === '/browse' && (
                                                        <div className="absolute inset-0 bg-primary/10 rounded-xl" />
                                                    )}
                                                    <div className="absolute inset-0 bg-surface/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>

                                                <Link
                                                    href="/favorites"
                                                    className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group ${pathname === '/favorites'
                                                        ? 'text-accent'
                                                        : 'text-text-secondary hover:text-text-primary'
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

                                            {/* User Menu */}
                                            <div className="flex items-center gap-3 pl-6 border-l border-surface-light/50">
                                                <div className="relative group">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary border border-primary/20 group-hover:border-primary/40 transition-all cursor-pointer">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                </div>

                                                <button
                                                    onClick={handleLogoutClick}
                                                    className="p-2.5 text-text-secondary hover:text-accent transition-all rounded-xl hover:bg-surface/50 group"
                                                    title="Cerrar Sesión"
                                                >
                                                    <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Link
                                                href="/login"
                                                className="px-5 py-2.5 text-text-secondary hover:text-text-primary transition-all font-medium rounded-xl hover:bg-surface/50"
                                            >
                                                Iniciar Sesión
                                            </Link>
                                            <Link
                                                href="/register"
                                                className="relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold overflow-hidden group"
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
                            className="md:hidden p-2 text-text-primary hover:bg-surface/50 rounded-xl transition-all"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden glass-effect border-t border-surface-light/50">
                        <div className="px-4 py-6 space-y-3">
                            {user ? (
                                <>
                                    <Link
                                        href="/browse"
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Search className="w-5 h-5 text-primary" />
                                        <span className="font-medium">Explorar</span>
                                    </Link>
                                    <Link
                                        href="/favorites"
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Heart className="w-5 h-5 text-accent" />
                                        <span className="font-medium">Favoritos</span>
                                    </Link>
                                    <button
                                        onClick={handleLogoutClick}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface/50 transition-all text-accent"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        <span className="font-medium">Cerrar Sesión</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="block px-4 py-3 rounded-xl hover:bg-surface/50 transition-all font-medium text-center"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Iniciar Sesión
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="block px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-center"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Registrarse
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

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
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-light hover:bg-surface-light/50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmLogout}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
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
