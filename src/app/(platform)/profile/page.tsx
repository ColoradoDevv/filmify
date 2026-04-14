'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useFavorites, useWatched } from '@/lib/store/useStore';
import MovieCard from '@/components/features/MovieCard';
import { Eye, Heart, Users, Search, MessageSquare, ListChecks, Settings, Loader2, Star } from 'lucide-react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { useTVDetection } from '@/hooks/useTVDetection';
import type { Movie } from '@/types/tmdb';

interface ReviewItem {
    id: string;
    media_id: number;
    media_type: 'movie' | 'tv';
    rating: number;
    content: string;
    created_at: string;
}

interface ProfileRecord {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

interface FriendProfile {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

export default function ProfilePage() {
    const favorites = useFavorites();
    const watched = useWatched();
    const { isTV } = useTVDetection();
    const containerRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<ProfileRecord | null>(null);
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [friendQuery, setFriendQuery] = useState('');
    const [friendResults, setFriendResults] = useState<FriendProfile[]>([]);
    const [friendLoading, setFriendLoading] = useState(false);

    useSpatialNavigation(containerRef, {
        enabled: isTV,
        focusOnMount: true,
    });

    useEffect(() => {
        let active = true;

        const loadUserProfile = async () => {
            setLoading(true);
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (!active || authError || !user) {
                    return;
                }

                setUser(user);

                const [{ data: profileData }, { data: reviewData }] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, full_name, username, avatar_url')
                        .eq('id', user.id)
                        .single(),
                    supabase
                        .from('reviews')
                        .select('id, media_id, media_type, rating, content, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }),
                ]);

                if (active && profileData) {
                    setProfile(profileData as ProfileRecord);
                }

                if (active && reviewData) {
                    setReviews(reviewData as ReviewItem[]);
                }
            } catch (error) {
                console.error('Error cargando perfil:', error);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadUserProfile();

        return () => {
            active = false;
        };
    }, [supabase]);

    useEffect(() => {
        if (friendQuery.trim().length < 2 || !user) {
            setFriendResults([]);
            return;
        }

        const handler = window.setTimeout(async () => {
            setFriendLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url')
                    .or(`username.ilike.%${friendQuery}%,full_name.ilike.%${friendQuery}%`)
                    .neq('id', user.id)
                    .limit(8);

                if (error) {
                    throw error;
                }

                setFriendResults(data || []);
            } catch (error) {
                console.error('Error buscando amigos:', error);
                setFriendResults([]);
            } finally {
                setFriendLoading(false);
            }
        }, 300);

        return () => window.clearTimeout(handler);
    }, [friendQuery, supabase, user]);

    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Tu perfil';
    const username = profile?.username || user?.user_metadata?.username || 'usuario';
    const privacyStatus = user?.user_metadata?.privacy?.publicProfile ?? true;

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="text-center text-text-secondary">
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                    <p>Cargando tu perfil...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
                <div className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-10">
                    <h1 className="text-3xl font-bold mb-4">Accede a tu perfil</h1>
                    <p className="text-text-secondary mb-6">Inicia sesión para ver tus favoritos, actividad y amigos.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/login" className="px-6 py-3 rounded-2xl bg-primary text-black font-semibold hover:bg-primary-hover transition">
                            Iniciar Sesión
                        </Link>
                        <Link href="/register" className="px-6 py-3 rounded-2xl border border-white/10 text-white hover:bg-white/10 transition">
                            Crear Cuenta
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="space-y-8 pb-24 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-8 shadow-xl shadow-black/10">
                <div className="grid gap-8 lg:grid-cols-[auto_1fr_auto] items-center">
                    <div className="flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-4xl font-bold text-white">{username[0]?.toUpperCase()}</span>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm uppercase tracking-[0.25em] text-text-secondary">Perfil de usuario</p>
                            <h1 className="text-4xl font-bold text-white">{displayName}</h1>
                            <p className="text-text-secondary">@{username}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-2">
                                <Heart className="w-4 h-4 text-accent" />
                                {favorites.length} Favoritos
                            </span>
                            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-2">
                                <Eye className="w-4 h-4 text-white" />
                                {watched.length} Vistos
                            </span>
                            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-2">
                                <MessageSquare className="w-4 h-4 text-primary" />
                                {reviews.length} Reseñas
                            </span>
                            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                {privacyStatus ? 'Perfil público' : 'Perfil privado'}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <Link
                            href="/settings"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            <Settings className="w-4 h-4" />
                            Ajustes de privacidad
                        </Link>
                        <Link
                            href="/lists"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-black px-5 py-3 text-sm font-semibold transition hover:bg-primary-hover"
                        >
                            <ListChecks className="w-4 h-4" />
                            Ver mis listas
                        </Link>
                    </div>
                </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
                <main className="space-y-8">
                    <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Favoritos</h2>
                                <p className="text-text-secondary">Tus películas guardadas en un solo lugar.</p>
                            </div>
                            <Link
                                href="/favorites"
                                className="text-sm font-semibold text-primary hover:text-primary-hover transition"
                            >
                                Ver todos
                            </Link>
                        </div>

                        {favorites.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {favorites.slice(0, 8).map((movie) => (
                                    <div key={movie.id} className="tv-focusable rounded-3xl">
                                        <MovieCard movie={movie} mediaType="movie" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-text-secondary mb-4">Aún no tienes favoritos.</p>
                                <Link
                                    href="/browse"
                                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover"
                                >
                                    Explorar películas
                                </Link>
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Vistos</h2>
                                <p className="text-text-secondary">Películas que marcaste como vistas.</p>
                            </div>
                            <Link
                                href="/browse"
                                className="text-sm font-semibold text-primary hover:text-primary-hover transition"
                            >
                                Seguir explorando
                            </Link>
                        </div>

                        {watched.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {watched.slice(0, 8).map((movie) => (
                                    <div key={movie.id} className="tv-focusable rounded-3xl">
                                        <MovieCard movie={movie} mediaType="movie" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-text-secondary mb-4">No has marcado ninguna película como vista.</p>
                                <Link
                                    href="/browse"
                                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover"
                                >
                                    Encuentra tu próxima película
                                </Link>
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Reseñas</h2>
                                <p className="text-text-secondary">Tus comentarios más recientes.</p>
                            </div>
                            <span className="text-sm text-text-secondary">{reviews.length} reseñas</span>
                        </div>

                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.slice(0, 5).map((review) => (
                                    <div key={review.id} className="rounded-3xl border border-surface-light/30 bg-background/50 p-4">
                                        <div className="flex items-center justify-between gap-4 mb-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {review.media_type === 'movie' ? 'Película' : 'Serie'} #{review.media_id}
                                                </p>
                                                <p className="text-xs text-text-secondary">{new Date(review.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-sm text-text-secondary">
                                                <Star className="w-4 h-4 text-yellow-400" />
                                                {review.rating}/10
                                            </div>
                                        </div>
                                        <p className="text-text-secondary text-sm leading-relaxed">{review.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-text-secondary mb-4">Aún no has escrito reseñas.</p>
                                <Link
                                    href="/browse"
                                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover"
                                >
                                    Escribe tu primera reseña
                                </Link>
                            </div>
                        )}
                    </section>
                </main>

                <aside className="space-y-6">
                    <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Amigos</h2>
                                <p className="text-text-secondary text-sm">Busca perfiles y conecta con otras cinéfilas.</p>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                            <input
                                type="text"
                                value={friendQuery}
                                onChange={(e) => setFriendQuery(e.target.value)}
                                placeholder="Buscar por nombre o usuario"
                                className="w-full rounded-2xl border border-surface-light/30 bg-background/80 py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="mt-4 space-y-3">
                            {friendLoading ? (
                                <div className="rounded-2xl border border-surface-light/30 bg-background/80 p-4 text-center text-text-secondary">
                                    Buscando perfiles...
                                </div>
                            ) : friendQuery.trim().length >= 2 ? (
                                friendResults.length > 0 ? (
                                    friendResults.map((friend) => (
                                        <div key={friend.id} className="rounded-2xl border border-surface-light/30 bg-background/80 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white">
                                                    {friend.avatar_url ? (
                                                        <img src={friend.avatar_url} alt={friend.full_name || friend.username || 'Perfil'} className="h-full w-full rounded-2xl object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-semibold">{friend.username?.[0]?.toUpperCase() || 'A'}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{friend.full_name || friend.username}</p>
                                                    <p className="text-xs text-text-secondary truncate">@{friend.username || 'perfil'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-surface-light/30 bg-background/80 p-4 text-text-secondary">
                                        No se encontraron amigos con ese nombre.
                                    </div>
                                )
                            ) : (
                                <div className="rounded-2xl border border-surface-light/30 bg-background/80 p-4 text-text-secondary">
                                    Escribe al menos 2 caracteres para buscar amigos.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                                <ListChecks className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Listas</h2>
                                <p className="text-text-secondary text-sm">Tu espacio para colecciones personalizadas.</p>
                            </div>
                        </div>
                        <p className="text-text-secondary text-sm leading-6 mb-6">
                            La gestión de listas está en desarrollo. Pronto podrás crear colecciones, compartirlas y seguir las listas de tus amigos.
                        </p>
                        <Link
                            href="/lists"
                            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover"
                        >
                            Ir a Listas
                        </Link>
                    </section>
                </aside>
            </div>
        </div>
    );
}
