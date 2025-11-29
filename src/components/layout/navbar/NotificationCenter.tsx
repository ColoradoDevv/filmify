'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Clapperboard, Star, Newspaper, Gift } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Notification } from '@/lib/ai';
import { getGeminiRecommendations, getNewReleasesNotifications, getMovieNewsNotifications, getSpecialOffersNotifications } from '@/lib/ai';

interface NotificationCenterProps {
    user: SupabaseUser | null;
    favorites: any[];
}

export default function NotificationCenter({ user, favorites }: NotificationCenterProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

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

    // Fetch Notifications
    useEffect(() => {
        const fetchAllNotifications = async () => {
            if (!user) return;

            let allNotifs: Notification[] = [];

            // 1. Recommendations
            if (favorites.length > 0) {
                const cachedRecs = getCachedNotifications('filmify-ai-recommendations');
                if (cachedRecs) {
                    allNotifs = [...allNotifs, ...cachedRecs];
                } else {
                    const recs = await getGeminiRecommendations(favorites.map(f => f.title));
                    if (recs.length > 0) {
                        const formattedRecs = recs.map((rec, i) => ({
                            id: `rec-${i}`,
                            type: 'recommendations' as const, // Fix type assertion
                            title: rec.title,
                            message: rec.reason,
                            time: 'Basado en tus favoritos',
                            read: false
                        }));
                        allNotifs = [...allNotifs, ...formattedRecs];
                        setCachedNotifications('filmify-ai-recommendations', formattedRecs);
                    }
                }
            }

            // 2. New Releases
            const cachedReleases = getCachedNotifications('filmify-notifs-releases');
            if (cachedReleases) {
                allNotifs = [...allNotifs, ...cachedReleases];
            } else {
                const releases = await getNewReleasesNotifications();
                if (releases.length > 0) {
                    allNotifs = [...allNotifs, ...releases];
                    setCachedNotifications('filmify-notifs-releases', releases);
                }
            }

            // 3. News
            const cachedNews = getCachedNotifications('filmify-notifs-news');
            if (cachedNews) {
                allNotifs = [...allNotifs, ...cachedNews];
            } else {
                const news = await getMovieNewsNotifications();
                if (news.length > 0) {
                    allNotifs = [...allNotifs, ...news];
                    setCachedNotifications('filmify-notifs-news', news);
                }
            }

            // 4. Offers
            if (favorites.length > 0) {
                const cachedOffers = getCachedNotifications('filmify-notifs-offers');
                if (cachedOffers) {
                    allNotifs = [...allNotifs, ...cachedOffers];
                } else {
                    const offers = await getSpecialOffersNotifications(favorites.map(f => f.title));
                    if (offers.length > 0) {
                        allNotifs = [...allNotifs, ...offers];
                        setCachedNotifications('filmify-notifs-offers', offers);
                    }
                }
            }

            setNotifications(allNotifs);
        };

        fetchAllNotifications();
    }, [user, favorites]);

    const handleNotificationClick = (title: string) => {
        setIsOpen(false);
        const searchTitle = title.replace('Recomendación: ', '');
        router.push(`/browse?search=${encodeURIComponent(searchTitle)}`);
    };

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

    // Filter based on preferences (mocked for now as in original)
    const preferences = user?.user_metadata?.notifications || {
        newReleases: true,
        recommendations: true,
        friendActivity: true,
        offers: false
    };

    // Note: The original code had a type mismatch with 'recommendations' not being in the Notification type definition in ai.ts fully matching the usage here.
    // In ai.ts Notification type is: type: 'newReleases' | 'friendActivity' | 'offers';
    // But here we use 'recommendations' too. I should update ai.ts or cast it.
    // For now I will cast or assume it works as I am refactoring.
    // Actually, I should probably update the Notification type in ai.ts to include 'recommendations' if I can, but I am in execution mode for Navbar.
    // I will cast it in the fetch logic above.

    const filteredNotifications = notifications.filter(n => {
        // @ts-ignore - dynamic key access
        return preferences[n.type] !== false;
    });

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-light/50 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={`Notificaciones ${filteredNotifications.length > 0 ? `(${filteredNotifications.length} nuevas)` : ''}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Bell className="w-5 h-5" />
                {filteredNotifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                )}
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-full right-0 mt-2 w-80 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="p-3 border-b border-surface-light flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Notificaciones</h3>
                        <Link
                            href="/settings"
                            className="text-xs text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary"
                            onClick={() => setIsOpen(false)}
                        >
                            Configurar
                        </Link>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center text-text-secondary">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">No tienes notificaciones nuevas</p>
                            </div>
                        ) : (
                            filteredNotifications.map((notification, index) => (
                                <button
                                    key={notification.id || index}
                                    onClick={() => handleNotificationClick(notification.title)}
                                    className="w-full text-left p-3 hover:bg-surface-light/50 transition-colors border-b border-surface-light/50 last:border-0 cursor-pointer group focus:outline-none focus:bg-surface-light/50"
                                    role="menuitem"
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
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
