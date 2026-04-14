'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useFavorites, useWatched } from '@/lib/store/useStore';
import MovieCard from '@/components/features/MovieCard';
import { Eye, Heart, Users, Search, MessageSquare, ListChecks, Settings, Loader2, Star } from 'lucide-react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { useTVDetection } from '@/hooks/useTVDetection';
import { getMediaDetails } from '@/lib/tmdb/client';
import { getPosterUrl } from '@/lib/tmdb/helpers';
import type { User } from '@supabase/supabase-js';

interface ReviewItem {
    id: string;
    media_id: number;
    media_type: 'movie' | 'tv';
    rating: number;
    content: string;
    created_at: string;
}

interface ProfilePreferences {
    privacy?: {
        publicProfile?: boolean;
        allowFriendRequests?: boolean;
        showWatchHistory?: boolean;
        showWatchlist?: boolean;
    };
    friends?: string[];
    incomingFriendRequests?: string[];
    outgoingFriendRequests?: string[];
}

interface ProfileRecord {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    preferences?: ProfilePreferences | null;
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

    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileRecord | null>(null);
    const [profilePreferences, setProfilePreferences] = useState<ProfilePreferences | null>(null);
    const [friendList, setFriendList] = useState<FriendProfile[]>([]);
    const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<FriendProfile[]>([]);
    const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendProfile[]>([]);
    const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
    const [requestActionError, setRequestActionError] = useState<string | null>(null);
    const [requestActionSuccess, setRequestActionSuccess] = useState<string | null>(null);
    const [reviewMedia, setReviewMedia] = useState<Record<string, { id: number; title: string; poster_path: string | null; media_type: 'movie' | 'tv' }>>({});
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [friendQuery, setFriendQuery] = useState('');
    const [friendResults, setFriendResults] = useState<FriendProfile[]>([]);
    const [friendLoading, setFriendLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'summary' | 'friends' | 'reviews'>('summary');

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
                        .select('id, full_name, username, avatar_url, bio, preferences')
                        .eq('id', user.id)
                        .single(),
                    supabase
                        .from('reviews')
                        .select('id, media_id, media_type, rating, content, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }),
                ]);

                if (active && profileData) {
                    const loadedProfile = profileData as ProfileRecord;
                    setProfile(loadedProfile);
                    setProfilePreferences(loadedProfile.preferences ?? null);

                    const friendIds = loadedProfile.preferences?.friends ?? [];
                    const outgoingIds = loadedProfile.preferences?.outgoingFriendRequests ?? [];
                    const incomingIds = loadedProfile.preferences?.incomingFriendRequests ?? [];
                    const allUserIds = Array.from(new Set([...friendIds, ...outgoingIds, ...incomingIds]));

                    if (allUserIds.length > 0) {
                        const { data: relatedProfiles, error: relatedError } = await supabase
                            .from('profiles')
                            .select('id, full_name, username, avatar_url')
                            .in('id', allUserIds)
                            .limit(30);

                        if (relatedError) {
                            console.error('Error cargando solicitudes de amistad:', relatedError);
                        } else {
                            const profiles = (relatedProfiles || []) as FriendProfile[];
                            setFriendList(profiles.filter((item) => friendIds.includes(item.id)));
                            setOutgoingFriendRequests(profiles.filter((item) => outgoingIds.includes(item.id)));
                            setIncomingFriendRequests(profiles.filter((item) => incomingIds.includes(item.id)));
                        }
                    } else {
                        setFriendList([]);
                        setOutgoingFriendRequests([]);
                        setIncomingFriendRequests([]);
                    }
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
        const sanitizedQuery = friendQuery.replace(/@/g, '').trim();
        if (sanitizedQuery.length < 2 || !user) {
            setFriendResults([]);
            return;
        }

        const handler = window.setTimeout(async () => {
            setFriendLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url')
                    .or(`username.ilike.%${sanitizedQuery}%,full_name.ilike.%${sanitizedQuery}%`)
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

    useEffect(() => {
        const loadReviewMedia = async () => {
            if (reviews.length === 0) {
                setReviewMedia({});
                return;
            }

            const visibleReviews = reviews.slice(0, 5);
            const results = await Promise.allSettled(
                visibleReviews.map(async (review) => {
                    try {
                        const details = await getMediaDetails(review.media_type, review.media_id);
                        return {
                            id: review.media_id,
                            title: review.media_type === 'movie' ? details.title : details.name,
                            poster_path: details.poster_path || null,
                            media_type: review.media_type,
                        };
                    } catch {
                        return null;
                    }
                })
            );

            const mediaMap: Record<string, { id: number; title: string; poster_path: string | null; media_type: 'movie' | 'tv' }> = {};
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const review = visibleReviews[index];
                    mediaMap[`${review.media_type}-${review.media_id}`] = result.value;
                }
            });
            setReviewMedia(mediaMap);
        };

        loadReviewMedia();
    }, [reviews]);

    const getReviewMediaKey = (review: ReviewItem) => `${review.media_type}-${review.media_id}`;

    const handleFriendAction = async (
        action: 'accept' | 'reject' | 'cancel' | 'remove',
        requesterId: string,
        targetId: string
    ) => {
        if (!user) return;

        const loadingKey = `${action}-${requesterId}-${targetId}`;
        setRequestActionLoading(loadingKey);
        setRequestActionError(null);
        setRequestActionSuccess(null);

        try {
            const response = await fetch('/api/friends', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, requesterId, targetId }),
            });

            const result = await response.json();
            if (!response.ok || result.error) {
                setRequestActionError(result.error || 'No se pudo procesar la solicitud.');
                return;
            }

            if (action === 'accept') {
                setIncomingFriendRequests((current) => current.filter((request) => request.id !== requesterId));
                setFriendList((current) => {
                    if (current.some((item) => item.id === requesterId)) return current;
                    const accepted = incomingFriendRequests.find((item) => item.id === requesterId);
                    return accepted ? [...current, accepted] : current;
                });
                setProfilePreferences((current) => {
                    if (!current) return current;
                    return {
                        ...current,
                        incomingFriendRequests: (current.incomingFriendRequests || []).filter((id) => id !== requesterId),
                        friends: Array.from(new Set([...(current.friends || []), requesterId])),
                    };
                });
            }

            if (action === 'reject') {
                setIncomingFriendRequests((current) => current.filter((request) => request.id !== requesterId));
                setProfilePreferences((current) => {
                    if (!current) return current;
                    return {
                        ...current,
                        incomingFriendRequests: (current.incomingFriendRequests || []).filter((id) => id !== requesterId),
                    };
                });
            }

            if (action === 'cancel') {
                setOutgoingFriendRequests((current) => current.filter((request) => request.id !== targetId));
                setProfilePreferences((current) => {
                    if (!current) return current;
                    return {
                        ...current,
                        outgoingFriendRequests: (current.outgoingFriendRequests || []).filter((id) => id !== targetId),
                    };
                });
            }

            if (action === 'remove') {
                setFriendList((current) => current.filter((friend) => friend.id !== requesterId));
                setProfilePreferences((current) => {
                    if (!current) return current;
                    return {
                        ...current,
                        friends: (current.friends || []).filter((id) => id !== requesterId),
                    };
                });
            }

            setRequestActionSuccess(
                action === 'accept'
                    ? 'Solicitud aceptada.'
                    : action === 'reject'
                    ? 'Solicitud rechazada.'
                    : action === 'cancel'
                    ? 'Solicitud cancelada.'
                    : 'Amigo eliminado.'
            );
        } catch (error) {
            console.error(error);
            setRequestActionError('Ocurrió un error procesando la solicitud.');
        } finally {
            setRequestActionLoading(null);
        }
    };

    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Tu perfil';
    const username = profile?.username || user?.user_metadata?.username || 'usuario';
    const bio = profile?.bio || user?.user_metadata?.bio || '';
    const privacyStatus = profilePreferences?.privacy?.publicProfile ?? user?.user_metadata?.privacy?.publicProfile ?? true;

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
            <section className="rounded-3xl border border-surface-light/30 bg-surface-light/80 shadow-xl shadow-black/10">
                <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-5xl font-bold text-white">{username[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Mi perfil</p>
                            <h1 className="mt-2 text-4xl font-bold text-white">{displayName}</h1>
                            <p className="text-text-secondary">@{username}</p>
                            <p className="mt-4 max-w-2xl text-text-secondary">{bio || 'Agrega una biografía en Configuración para que otros te conozcan mejor.'}</p>
                        </div>
                    </div>
                    <div className="grid gap-3 md:justify-end">
                        <Link
                            href="/settings"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            <Settings className="w-4 h-4" />
                            Ajustes de privacidad
                        </Link>
                        <Link
                            href="/lists"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover"
                        >
                            <ListChecks className="w-4 h-4" />
                            Ver mis listas
                        </Link>
                    </div>
                </div>
                <div className="grid gap-3 border-t border-surface-light/30 p-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-3xl border border-surface-light/30 bg-background/90 p-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2 text-white font-semibold mb-2">
                            <Heart className="w-4 h-4 text-accent" /> Favoritos
                        </div>
                        <p className="text-3xl font-bold text-white">{favorites.length}</p>
                    </div>
                    <div className="rounded-3xl border border-surface-light/30 bg-background/90 p-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2 text-white font-semibold mb-2">
                            <Eye className="w-4 h-4" /> Vistos
                        </div>
                        <p className="text-3xl font-bold text-white">{watched.length}</p>
                    </div>
                    <div className="rounded-3xl border border-surface-light/30 bg-background/90 p-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2 text-white font-semibold mb-2">
                            <MessageSquare className="w-4 h-4 text-primary" /> Reseñas
                        </div>
                        <p className="text-3xl font-bold text-white">{reviews.length}</p>
                    </div>
                    <div className="rounded-3xl border border-surface-light/30 bg-background/90 p-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2 text-white font-semibold mb-2">
                            <Users className="w-4 h-4 text-purple-400" /> Visibilidad
                        </div>
                        <p className="text-3xl font-bold text-white">{privacyStatus ? 'Público' : 'Privado'}</p>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-surface-light/30 bg-surface-light/80 p-6 shadow-xl shadow-black/5">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Pestañas</p>
                        <h2 className="text-2xl font-semibold text-white">Navega tu perfil</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('summary')}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'summary' ? 'bg-white text-black' : 'bg-background/80 text-text-secondary hover:bg-background/90'}`}
                        >
                            Resumen
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('friends')}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'friends' ? 'bg-white text-black' : 'bg-background/80 text-text-secondary hover:bg-background/90'}`}
                        >
                            Amigos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('reviews')}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'reviews' ? 'bg-white text-black' : 'bg-background/80 text-text-secondary hover:bg-background/90'}`}
                        >
                            Reseñas
                        </button>
                    </div>
                </div>

                {activeTab === 'summary' && (
                    <div className="space-y-8">
                        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
                            <div className="space-y-8">
                                <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">Favoritos</h3>
                                            <p className="text-text-secondary">Tus películas guardadas en un solo lugar.</p>
                                        </div>
                                        <Link href="/favorites" className="text-sm font-semibold text-primary hover:text-primary-hover transition">
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
                                            <Link href="/browse" className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover">
                                                Explorar películas
                                            </Link>
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">Vistos</h3>
                                            <p className="text-text-secondary">Películas que marcaste como vistas.</p>
                                        </div>
                                        <Link href="/browse" className="text-sm font-semibold text-primary hover:text-primary-hover transition">
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
                                            <Link href="/browse" className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover">
                                                Encuentra tu próxima película
                                            </Link>
                                        </div>
                                    )}
                                </section>
                            </div>

                            <div className="space-y-8">
                                <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                                            <ListChecks className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">Listas</h3>
                                            <p className="text-text-secondary text-sm">Tus colecciones personales.</p>
                                        </div>
                                    </div>
                                    <p className="text-text-secondary text-sm leading-relaxed mb-6">
                                        La gestión de listas está en desarrollo. Pronto podrás crear colecciones, compartirlas y seguir las listas de tus amigos.
                                    </p>
                                    <Link href="/lists" className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary-hover">
                                        Ir a Listas
                                    </Link>
                                </section>

                                <section className="rounded-3xl border border-surface-light/30 bg-background/90 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">Resumen rápido</h3>
                                            <p className="text-text-secondary text-sm">Tu estado de perfil actual.</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 text-sm text-text-secondary">
                                        <div className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-4">
                                            <p className="font-semibold text-white">Visibilidad</p>
                                            <p>{privacyStatus ? 'Perfil público' : 'Perfil privado'}</p>
                                        </div>
                                        <div className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-4">
                                            <p className="font-semibold text-white">Solicitudes pendientes</p>
                                            <p>{incomingFriendRequests.length} entrantes · {outgoingFriendRequests.length} enviadas</p>
                                        </div>
                                        <div className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-4">
                                            <p className="font-semibold text-white">Amigos</p>
                                            <p>{friendList.length} conexiones</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'friends' && (
                    <div className="space-y-8">
                        <section className="rounded-3xl border border-surface-light/30 bg-background/90 p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Buscar amigos</h3>
                                    <p className="text-text-secondary text-sm">Encuentra perfiles y envía solicitudes rápidamente.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                                <input
                                    type="text"
                                    value={friendQuery}
                                    onChange={(e) => setFriendQuery(e.target.value)}
                                    placeholder="Buscar por nombre o usuario"
                                    className="w-full rounded-2xl border border-surface-light/30 bg-background/90 py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div className="mt-4 space-y-3">
                                {friendLoading ? (
                                    <div className="rounded-2xl border border-surface-light/30 bg-surface-light/10 p-4 text-center text-text-secondary">
                                        Buscando perfiles...
                                    </div>
                                ) : friendQuery.trim().length >= 2 ? (
                                    friendResults.length > 0 ? (
                                        friendResults.map((friend) => (
                                            <Link
                                                key={friend.id}
                                                href={`/profile/${encodeURIComponent(friend.username || friend.id)}`}
                                                className="block rounded-2xl border border-surface-light/30 bg-background/80 p-4 transition hover:border-primary/50 hover:bg-surface-light/10"
                                            >
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
                                            </Link>
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
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold">Solicitudes entrantes</h3>
                                    <p className="text-text-secondary text-sm">Revisa y responde solicitudes pendientes.</p>
                                </div>
                                <span className="text-sm text-text-secondary">{incomingFriendRequests.length} pendientes</span>
                            </div>
                            {requestActionError && (
                                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                                    {requestActionError}
                                </div>
                            )}
                            {requestActionSuccess && (
                                <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-emerald-300">
                                    {requestActionSuccess}
                                </div>
                            )}
                            {incomingFriendRequests.length > 0 ? (
                                <div className="space-y-3">
                                    {incomingFriendRequests.map((request) => (
                                        <div key={request.id} className="rounded-3xl border border-surface-light/30 bg-background/80 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white">
                                                    {request.avatar_url ? (
                                                        <img src={request.avatar_url} alt={request.full_name || request.username || 'Perfil'} className="h-full w-full rounded-2xl object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-semibold">{request.username?.[0]?.toUpperCase() || 'A'}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{request.full_name || request.username}</p>
                                                    <p className="text-xs text-text-secondary truncate">@{request.username || 'perfil'}</p>
                                                </div>
                                                <div className="ml-auto flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={requestActionLoading === `accept-${request.id}-${user.id}`}
                                                        onClick={() => handleFriendAction('accept', request.id, user.id)}
                                                        className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-black hover:bg-primary-hover transition disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {requestActionLoading === `accept-${request.id}-${user.id}` ? '...' : 'Aceptar'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={requestActionLoading === `reject-${request.id}-${user.id}`}
                                                        onClick={() => handleFriendAction('reject', request.id, user.id)}
                                                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-background/90 px-4 py-2 text-xs font-semibold text-white hover:border-red-400 hover:text-red-200 transition disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {requestActionLoading === `reject-${request.id}-${user.id}` ? '...' : 'Rechazar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-surface-light/30 bg-background/80 p-4 text-text-secondary">
                                    No tienes solicitudes pendientes.
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl border border-surface-light/30 bg-background/90 p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Amigos</h3>
                                    <p className="text-text-secondary text-sm">Tus conexiones activas.</p>
                                </div>
                                <span className="text-sm text-text-secondary">{friendList.length} amigos</span>
                            </div>
                            {friendList.length > 0 ? (
                                <div className="space-y-3">
                                    {friendList.map((friend) => (
                                        <div key={friend.id} className="flex items-center gap-3 rounded-3xl border border-surface-light/30 bg-surface-light/10 p-4">
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
                                            <button
                                                type="button"
                                                disabled={requestActionLoading === `remove-${friend.id}-${user.id}`}
                                                onClick={() => handleFriendAction('remove', friend.id, user.id)}
                                                className="ml-auto inline-flex items-center justify-center rounded-2xl border border-white/10 bg-background/90 px-4 py-2 text-xs font-semibold text-white hover:border-red-400 hover:text-red-200 transition disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {requestActionLoading === `remove-${friend.id}-${user.id}` ? '...' : 'Eliminar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-surface-light/30 bg-background/80 p-4 text-text-secondary">
                                    Aún no tienes amigos. Busca y envía solicitudes arriba.
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl border border-surface-light/30 bg-background/90 p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">Solicitudes enviadas</h3>
                                    <p className="text-text-secondary text-sm">Cancela solicitudes si ya no quieres que sigan pendientes.</p>
                                </div>
                                <span className="text-sm text-text-secondary">{outgoingFriendRequests.length} enviadas</span>
                            </div>
                            {outgoingFriendRequests.length > 0 ? (
                                <div className="space-y-3">
                                    {outgoingFriendRequests.map((friend) => (
                                        <div key={friend.id} className="flex items-center gap-3 rounded-3xl border border-surface-light/30 bg-surface-light/10 p-4">
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
                                            <button
                                                type="button"
                                                disabled={requestActionLoading === `cancel-${user.id}-${friend.id}`}
                                                onClick={() => handleFriendAction('cancel', user.id, friend.id)}
                                                className="ml-auto inline-flex items-center justify-center rounded-2xl border border-white/10 bg-background/90 px-4 py-2 text-xs font-semibold text-white hover:border-yellow-400 hover:text-yellow-200 transition disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {requestActionLoading === `cancel-${user.id}-${friend.id}` ? '...' : 'Cancelar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-surface-light/30 bg-background/80 p-4 text-text-secondary">
                                    No tienes solicitudes enviadas.
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <section className="rounded-3xl border border-surface-light/30 bg-surface-light/10 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white">Reseñas</h3>
                                <p className="text-text-secondary">Tus comentarios más recientes.</p>
                            </div>
                            <span className="text-sm text-text-secondary">{reviews.length} reseñas</span>
                        </div>
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.slice(0, 5).map((review) => {
                                    const reviewKey = getReviewMediaKey(review);
                                    const media = reviewMedia[reviewKey];
                                    const href = review.media_type === 'movie' ? `/movie/${review.media_id}` : `/tv/${review.media_id}`;
                                    return (
                                        <Link
                                            key={review.id}
                                            href={href}
                                            className="rounded-3xl border border-surface-light/30 bg-background/50 p-4 transition hover:border-primary/50 hover:bg-surface-light/10"
                                        >
                                            <div className="flex gap-4 items-start">
                                                <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-3xl bg-surface-light">
                                                    {media?.poster_path ? (
                                                        <Image
                                                            src={getPosterUrl(media.poster_path)}
                                                            alt={media.title}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-text-muted text-[10px] uppercase tracking-[0.2em]">
                                                            SIN IMAGEN
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-white truncate">{media?.title || `${review.media_type === 'movie' ? 'Película' : 'Serie'} #${review.media_id}`}</p>
                                                            <p className="text-xs text-text-secondary">{new Date(review.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-sm text-text-secondary">
                                                            <Star className="w-4 h-4 text-yellow-400" />
                                                            {review.rating}/10
                                                        </div>
                                                    </div>
                                                    <p className="text-text-secondary text-sm leading-relaxed mt-3 line-clamp-3">{review.content}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
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
                )}
            </section>
        </div>
    );
}
