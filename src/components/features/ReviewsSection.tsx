'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { Star, MessageSquare, User, Trash2, Loader2, Send, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 10;

interface Review {
    id: string;
    user_id: string;
    rating: number;
    content: string;
    created_at: string;
    profiles: {
        full_name: string;
        username: string;
        avatar_url: string | null;
    } | null;
}

interface ReviewsSectionProps {
    mediaId: number;
    mediaType: 'movie' | 'tv';
}

export default function ReviewsSection({ mediaId, mediaType }: ReviewsSectionProps) {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async (pageIndex: number, replace: boolean) => {
        replace ? setLoading(true) : setLoadingMore(true);
        try {
            const from = pageIndex * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error, count } = await supabase
                .from('reviews')
                .select(
                    `*, profiles:user_id (full_name, username, avatar_url)`,
                    { count: 'exact' }
                )
                .eq('media_id', mediaId)
                .eq('media_type', mediaType)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setReviews(prev => replace ? (data ?? []) : [...prev, ...(data ?? [])]);
            if (count !== null) setTotalCount(count);
            setPage(pageIndex);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            replace ? setLoading(false) : setLoadingMore(false);
        }
    }, [supabase, mediaId, mediaType]);

    useEffect(() => {
        let active = true;

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!active) return;
            setUser(user);
            setAuthLoading(false);
        };

        const { data: authSubscription } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
            if (!active) return;
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });

        getUser();
        fetchReviews(0, true);

        return () => {
            active = false;
            authSubscription.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaId, mediaType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (rating === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    user_id: user.id,
                    media_id: mediaId,
                    media_type: mediaType,
                    rating,
                    content,
                });

            if (error) throw error;

            setContent('');
            setRating(0);
            fetchReviews(0, true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!confirm('¿Estás seguro de eliminar tu reseña?')) return;

        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw error;
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            setTotalCount(prev => prev - 1);
        } catch (err) {
            console.error('Error deleting review:', err);
        }
    };

    const hasMore = reviews.length < totalCount;

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return (
        <section className="py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-primary" />
                        Reseñas de la Comunidad
                    </h2>
                    <p className="text-text-secondary text-sm mt-1">
                        {totalCount} {totalCount === 1 ? 'opinión' : 'opiniones'}
                        {averageRating && ` • Promedio: ${averageRating}/10`}
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Review Form */}
                <div className="lg:col-span-1">
                    <div className="bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-2xl p-6 sticky top-24">
                        {authLoading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                                <p className="text-text-secondary text-sm">Verificando sesión...</p>
                            </div>
                        ) : user ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="text-lg font-semibold text-white mb-4">Escribe tu reseña</h3>

                                {/* Rating Input */}
                                <div className="space-y-2">
                                    <label className="text-sm text-text-secondary">Calificación</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(star)}
                                                className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-5 h-5 ${star <= (hoverRating || rating)
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-gray-600'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-right text-xs text-yellow-400 font-bold h-4">
                                        {(hoverRating || rating) > 0 ? `${hoverRating || rating}/10` : ''}
                                    </div>
                                </div>

                                {/* Content Input */}
                                <div className="space-y-2">
                                    <label className="text-sm text-text-secondary">Tu opinión</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="¿Qué te pareció? Cuéntanos..."
                                        rows={4}
                                        className="w-full bg-surface-dark/50 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none text-sm"
                                        required
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Publicar Reseña
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <User className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-1">Inicia sesión</h3>
                                    <p className="text-sm text-text-secondary">
                                        Para dejar tu opinión necesitas una cuenta.
                                    </p>
                                </div>
                                <a
                                    href="/login"
                                    className="block w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm"
                                >
                                    Ir al Login
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reviews List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : reviews.length > 0 ? (
                        <>
                            {reviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="bg-surface-light/10 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-light border border-white/10">
                                                {review.profiles?.avatar_url ? (
                                                    <img
                                                        src={review.profiles.avatar_url}
                                                        alt={review.profiles.username}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm">
                                                        {review.profiles?.username?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium text-sm">
                                                    {review.profiles?.full_name || review.profiles?.username || 'Usuario Anónimo'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                                    <span>@{review.profiles?.username || 'anonimo'}</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: es })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-yellow-400 font-bold text-sm">{review.rating}</span>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {review.content}
                                    </p>

                                    {user?.id === review.user_id && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDelete(review.id)}
                                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Load More */}
                            {hasMore && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => fetchReviews(page + 1, false)}
                                        disabled={loadingMore}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-surface hover:bg-surface-light border border-surface-light text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loadingMore ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4" />
                                                Cargar más ({totalCount - reviews.length} restantes)
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 bg-surface-light/5 rounded-2xl border border-white/5 border-dashed">
                            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">Aún no hay reseñas</p>
                            <p className="text-sm text-gray-500">¡Sé el primero en compartir tu opinión!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
