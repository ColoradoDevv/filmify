'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, LogOut, User, Menu, X, Search, Heart, Settings, Sparkles, Bell, Clapperboard, Star, Newspaper, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { getGeminiRecommendations, getNewReleasesNotifications, getMovieNewsNotifications, getSpecialOffersNotifications } from '@/lib/gemini';
import { useFavorites } from '@/lib/store/useStore';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
    const [newReleasesNotifs, setNewReleasesNotifs] = useState<any[]>([]);
    const [newsNotifs, setNewsNotifs] = useState<any[]>([]);
    const [offersNotifs, setOffersNotifs] = useState<any[]>([]);
    const supabase = createClient();
    const favorites = useFavorites();

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

    // Cache helpers
    const ONE_HOUR = 60 * 60 * 1000;

    const getCachedNotifications = (key: string) => {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ONE_HOUR) return data;

            localStorage.removeItem(key);
            return null;
        } catch {
            return null;
        }
    };

    const setCachedNotifications = (key: string, data: any[]) => {
        try {
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
            console.warn('Failed to cache notifications:', e);
        }
    };

    // Fetch Recommendations
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!user || favorites.length === 0) return;

            const cached = getCachedNotifications('filmify-ai-recommendations');
            if (cached) {
                setAiRecommendations(cached);
                return;
            }

            const recs = await getGeminiRecommendations(favorites.map(f => f.title));
            if (recs.length > 0) {
                const formattedRecs = recs.map((rec, i) => ({
                    id: `rec-${i}`,
                    type: 'recommendations',
                    title: rec.title,
                    message: rec.reason,
                    time: 'Basado en tus favoritos',
                    read: false
                }));
                setAiRecommendations(formattedRecs);
                setCachedNotifications('filmify-ai-recommendations', formattedRecs);
            }
        };
        fetchRecommendations();
    }, [user, favorites]);

    // Fetch New Releases
    useEffect(() => {
        const fetchNewReleases = async () => {
            if (!user) return;

            const cached = getCachedNotifications('filmify-notifs-releases');
            if (cached) {
                setNewReleasesNotifs(cached);
                return;
            }

            const notifs = await getNewReleasesNotifications();
            if (notifs.length > 0) {
                setNewReleasesNotifs(notifs);
                setCachedNotifications('filmify-notifs-releases', notifs);
            }
        };
        fetchNewReleases();
    }, [user]);

    // Fetch News
    useEffect(() => {
        const fetchNews = async () => {
            if (!user) return;

            const cached = getCachedNotifications('filmify-notifs-news');
            if (cached) {
                setNewsNotifs(cached);
                return;
            }

            const notifs = await getMovieNewsNotifications();
            if (notifs.length > 0) {
                setNewsNotifs(notifs);
                setCachedNotifications('filmify-notifs-news', notifs);
            }
        };
        fetchNews();
    }, [user]);

    // Fetch Offers
    useEffect(() => {
        const fetchOffers = async () => {
            if (!user) return;

            const cached = getCachedNotifications('filmify-notifs-offers');
            if (cached) {
                setOffersNotifs(cached);
                return;
            }

            const notifs = await getSpecialOffersNotifications(favorites.map(f => f.title));
            if (notifs.length > 0) {
                setOffersNotifs(notifs);
                setCachedNotifications('filmify-notifs-offers', notifs);
            }
        };
        fetchOffers();
    }, [user, favorites]);

    const handleNotificationClick = (title: string) => {
        setNotificationsOpen(false);
        const searchTitle = title.replace('Recomendación: ', '');
        router.push(`/browse?search=${encodeURIComponent(searchTitle)}`);
    };

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

                                            {/* Notification Center */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                                                    className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-light/50 rounded-xl transition-all"
                                                >
                                                    <Bell className="w-5 h-5" />
                                                    {/* Badge logic */}
                                                    {(aiRecommendations.length + newReleasesNotifs.length + newsNotifs.length + offersNotifs.length) > 0 && (
                                                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                                                    )}
                                                </button>

                                                {notificationsOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={() => setNotificationsOpen(false)}
                                                        />
                                                        <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in">
                                                            <div className="p-3 border-b border-surface-light flex items-center justify-between">
                                                                <h3 className="font-semibold text-sm">Notificaciones</h3>
                                                                <Link href="/settings" className="text-xs text-primary hover:underline" onClick={() => setNotificationsOpen(false)}>
                                                                    Configurar
                                                                </Link>
                                                            </div>

                                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                {(() => {
                                                                    const preferences = user?.user_metadata?.notifications || {
                                                                        newReleases: true,
                                                                        recommendations: true,
                                                                        friendActivity: true,
                                                                        offers: false
                                                                    };

                                                                    const allNotifications = [
                                                                        ...aiRecommendations,
                                                                        ...newReleasesNotifs,
                                                                        ...newsNotifs,
                                                                        ...offersNotifs
                                                                    ];

                                                                    const filteredNotifications = allNotifications.filter(n => preferences[n.type as keyof typeof preferences]);

                                                                    if (filteredNotifications.length === 0) {
                                                                        return (
                                                                            <div className="p-8 text-center text-text-secondary">
                                                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                                                <p className="text-xs">No tienes notificaciones nuevas</p>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const getNotificationIcon = (type: string) => {
                                                                        switch (type) {
                                                                            case 'newReleases':
                                                                                return <Clapperboard className="w-4 h-4 text-blue-400" />;
                                                                            case 'recommendations':
                                                                                return <Star className="w-4 h-4 text-yellow-400" />;
                                                                            case 'friendActivity':
                                                                                return <Newspaper className="w-4 h-4 text-green-400" />;
                                                                            case 'offers':
                                                                                return <Gift className="w-4 h-4 text-purple-400" />;
                                                                            default:
                                                                                return <Bell className="w-4 h-4 text-gray-400" />;
                                                                        }
                                                                    };

                                                                    return filteredNotifications.map(notification => (
                                                                        <div
                                                                            key={notification.id}
                                                                            onClick={() => handleNotificationClick(notification.title)}
                                                                            className="p-3 hover:bg-surface-light/50 transition-colors border-b border-surface-light/50 last:border-0 cursor-pointer group"
                                                                        >
                                                                            <div className="flex items-start gap-3">
                                                                                <div className="mt-0.5 p-1.5 bg-surface-light/50 rounded-lg">
                                                                                    {getNotificationIcon(notification.type)}
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <p className="text-sm font-medium text-white leading-none mb-1 group-hover:text-primary transition-colors">{notification.title}</p>
                                                                                    <p className="text-xs text-text-secondary mb-1.5">{notification.message}</p>
                                                                                    <p className="text-[10px] text-text-muted">{notification.time}</p>
                                                                                </div>
                                                                                {!notification.read && (
                                                                                    <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* User Menu */}
                                            <div className="flex items-center gap-3 pl-6 border-l border-surface-light/50 relative">
                                                <div
                                                    className="relative group cursor-pointer"
                                                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary border border-primary/20 group-hover:border-primary/40 transition-all">
                                                        <User className="w-5 h-5" />
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
                                                                    href="/settings"
                                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-light/50 text-text-secondary hover:text-text-primary transition-colors"
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
                                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
                                                                >
                                                                    <LogOut className="w-4 h-4" />
                                                                    <span className="text-sm font-medium">Cerrar Sesión</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
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
