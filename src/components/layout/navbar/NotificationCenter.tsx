'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Clapperboard, Newspaper, Settings, CheckCheck, Loader2 } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
    type AppNotification,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    subscribeToNotifications,
} from '@/lib/notifications';

interface NotificationCenterProps {
    user: SupabaseUser | null;
    /** kept for API compatibility with Navbar — no longer used */
    favorites?: any[];
}

export default function NotificationCenter({ user }: NotificationCenterProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // ── Load notifications on mount / user change ──────────────────────────
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            const data = await fetchNotifications();
            if (!cancelled) setNotifications(data);
            setLoading(false);
        };

        load();

        // ── Supabase Realtime: push new notifications instantly ────────────
        const channel = subscribeToNotifications(user.id, (newNotif) => {
            setNotifications((prev) => [newNotif, ...prev]);
        });

        return () => {
            cancelled = true;
            createClient().removeChannel(channel);
        };
    }, [user?.id]);

    // ── Close on click outside ─────────────────────────────────────────────
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, []);

    // ── Close on Escape ────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleOpen = () => setIsOpen((o) => !o);

    const handleNotificationClick = useCallback(async (notif: AppNotification) => {
        setIsOpen(false);

        // Mark as read optimistically
        if (!notif.read) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
            );
            await markAsRead(notif.id);
        }

        // Navigate to the linked content if available
        const url = notif.metadata?.url;
        if (url) router.push(url);
    }, [router]);

    const handleMarkAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        await markAllAsRead();
    }, []);

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'newRelease':
                return <Clapperboard className="w-4 h-4 text-blue-400" />;
            case 'recommendation':
                return <Bell className="w-4 h-4 text-yellow-400" />;
            case 'news':
                return <Newspaper className="w-4 h-4 text-green-400" />;
            case 'system':
            default:
                return <Settings className="w-4 h-4 text-slate-400" />;
        }
    };

    const formatTime = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60_000);
        if (mins < 1) return 'Ahora mismo';
        if (mins < 60) return `Hace ${mins} min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Hace ${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `Hace ${days}d`;
    };

    if (!user) return null;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-light/50 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                )}
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-full right-0 mt-2 w-80 bg-surface border border-surface-light rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                    role="menu"
                    aria-orientation="vertical"
                >
                    {/* Header */}
                    <div className="p-3 border-b border-surface-light flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-white">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors focus:outline-none"
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Marcar leídas
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-secondary">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`w-full text-left p-3 hover:bg-surface-light/50 transition-colors border-b border-surface-light/30 last:border-0 group focus:outline-none focus:bg-surface-light/50 ${!notif.read ? 'bg-primary/5' : ''}`}
                                    role="menuitem"
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Thumbnail or icon */}
                                        <div className="mt-0.5 flex-shrink-0">
                                            {notif.metadata?.imageUrl ? (
                                                <img
                                                    src={notif.metadata.imageUrl}
                                                    alt=""
                                                    className="w-8 h-12 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="p-1.5 bg-surface-light/50 rounded-lg">
                                                    {getIcon(notif.type)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white leading-snug mb-0.5 group-hover:text-primary transition-colors truncate">
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-text-secondary line-clamp-2 mb-1">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-text-muted">
                                                {formatTime(notif.created_at)}
                                            </p>
                                        </div>

                                        {!notif.read && (
                                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
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
