'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import {
    Star, MessageSquare, User, Trash2, Loader2, Send,
    ChevronDown, ChevronUp, PenLine, AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 10;
const MAX_CONTENT_LENGTH = 500;

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
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showFormMobile, setShowFormMobile] = useState(false);

    // Evitar doble montaje en estricto (React 18)
    const initialFetchDone = useRef(false);

    const fetchReviews = useCallback(
        async (pageIndex: number, replace: boolean) => {
            if (replace) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            try {
                const from = pageIndex * PAGE_SIZE;
                const to = from + PAGE_SIZE - 1;

                const { data, error, count } = await supabase
                    .from('reviews')
                    .select(`*, profiles:user_id (full_name, username, avatar_url)`, { count: 'exact' })
                    .eq('media_id', mediaId)
                    .eq('media_type', mediaType)
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;

                setReviews((prev) =>
                    replace ? (data ?? []) : [...prev, ...(data ?? [])]
                );
                if (count !== null) setTotalCount(count);
                setPage(pageIndex);
            } catch (err) {
                console.error('Error fetching reviews:', err);
                // Opcional: mostrar error al usuario
            } finally {
                if (replace) {
                    setLoading(false);
                } else {
                    setLoadingMore(false);
                }
            }
        },
        [supabase, mediaId, mediaType]
    );

    // Efecto de autenticación
    useEffect(() => {
        let active = true;

        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!active) return;
            setUser(user);
            setAuthLoading(false);
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                if (!active) return;
                setUser(session?.user ?? null);
                setAuthLoading(false);
            }
        );

        getUser();

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Carga inicial de reseñas (solo una vez por mediaId/mediaType)
    useEffect(() => {
        if (initialFetchDone.current) return;
        initialFetchDone.current = true;
        fetchReviews(0, true);
    }, [mediaId, mediaType, fetchReviews]);

    // Resetear flag cuando cambian los parámetros
    useEffect(() => {
        initialFetchDone.current = false;
    }, [mediaId, mediaType]);

    const [showNicknameModal, setShowNicknameModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || submitting) return;

        // Verificar que el usuario tenga nickname antes de publicar
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

        if (!profile?.username) {
            setShowNicknameModal(true);
            return;
        }

        if (rating === 0) {
            setError('Selecciona una calificación antes de enviar.');
            return;
        }
        if (!content.trim()) {
            setError('Escribe tu opinión antes de publicar.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const { error: insertError } = await supabase.from('reviews').insert({
                user_id: user.id,
                media_id: mediaId,
                media_type: mediaType,
                rating,
                content: content.trim(),
            });

            if (insertError) throw insertError;

            setContent('');
            setRating(0);
            setHoverRating(0);
            fetchReviews(0, true);
        } catch (err: any) {
            setError(err.message || 'Error al publicar la reseña.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!confirm('¿Eliminar tu reseña? Esta acción no se puede deshacer.')) return;

        const previousReviews = [...reviews];
        setDeletingId(reviewId);

        // Actualización optimista
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setTotalCount((prev) => prev - 1);

        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw error;
        } catch (err) {
            // Rollback
            setReviews(previousReviews);
            setTotalCount((prev) => prev + 1);
            console.error('Error deleting review:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const hasMore = reviews.length < totalCount;
    const isFormVisible = showFormMobile || (typeof window !== 'undefined' && window.innerWidth >= 1024);

    // Promedio calculado sobre las reseñas cargadas (para precisión total necesitarías un count(*) con AVG en BD)
    const averageRating =
        reviews.length > 0
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
            : null;

    return (
        <>
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

                {/* Toggle formulario en móvil */}
                <button
                    onClick={() => setShowFormMobile((v) => !v)}
                    className="lg:hidden flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-outline-variant text-white text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                    <PenLine className="w-4 h-4" />
                    {showFormMobile ? 'Ocultar' : 'Escribir reseña'}
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Columna del formulario (escritorio siempre, móvil colapsable) */}
                <div className={`lg:col-span-1 ${!showFormMobile ? 'hidden lg:block' : ''}`}>
                    <div className="bg-surface-light/30 backdrop-blur-sm border border-surface-light/50 rounded-2xl p-6 lg:sticky lg:top-24">
                        {authLoading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                                <p className="text-text-secondary text-sm">Verificando sesión...</p>
                            </div>
                        ) : user ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Tu reseña
                                </h3>

                                {/* Rating */}
                                <div className="space-y-2">
                                    <label className="text-sm text-text-secondary">
                                        Calificación
                                    </label>
                                    <div className="flex gap-1" role="radiogroup" aria-label="Puntuación de 1 a 10">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                                                aria-label={`${star} estrellas`}
                                                role="radio"
                                                aria-checked={rating === star}
                                            >
                                                <Star
                                                    className={`w-5 h-5 ${
                                                        star <= (hoverRating || rating)
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-600'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-right text-xs text-yellow-400 font-bold h-4">
                                        {(hoverRating || rating) > 0
                                            ? `${hoverRating || rating}/10`
                                            : ''}
                                    </div>
                                </div>

                                {/* Contenido */}
                                <div className="space-y-2">
                                    <label className="text-sm text-text-secondary">
                                        Tu opinión
                                    </label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => {
                                            if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                                                setContent(e.target.value);
                                            }
                                        }}
                                        placeholder="¿Qué te pareció? Cuéntanos..."
                                        rows={4}
                                        className="w-full bg-surface-dark/50 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none text-sm"
                                        required
                                    />
                                    <div className="text-right text-xs text-text-muted">
                                        {content.length}/{MAX_CONTENT_LENGTH}
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || rating === 0 || !content.trim()}
                                    className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Publicando...
                                        </>
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
                                <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <User className="w-7 h-7 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-1">
                                        Inicia sesión
                                    </h3>
                                    <p className="text-sm text-text-secondary max-w-xs mx-auto">
                                        Para dejar tu opinión necesitas una cuenta.
                                    </p>

                                    <div className="mt-3 text-xs text-text-secondary max-w-[18rem] mx-auto">
                                        <p className="text-text-secondary/90">
                                            Registro seguro: <span className="text-white font-semibold">no pedimos datos bancarios</span>.
                                        </p>
                                        <p className="text-text-secondary/90 mt-1">
                                            Tu cuenta se usa solo con fines sociales: <span className="text-white font-semibold">favoritos</span> y <span className="text-white font-semibold">reseñas</span>.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href="/login"
                                    className="inline-block w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm"
                                >
                                    Ir al Login
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lista de reseñas */}
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
                                                    {review.profiles?.full_name ||
                                                        review.profiles?.username ||
                                                        'Usuario Anónimo'}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                                    <span>
                                                        @{review.profiles?.username || 'anonimo'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {formatDistanceToNow(
                                                            new Date(review.created_at),
                                                            { addSuffix: true, locale: es }
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-yellow-400 font-bold text-sm">
                                                {review.rating}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {review.content}
                                    </p>

                                    {user?.id === review.user_id && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                                            <button
                                                onClick={() => handleDelete(review.id)}
                                                disabled={deletingId === review.id}
                                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === review.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Cargar más */}
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

                            {/* Fin del listado */}
                            {!hasMore && reviews.length > 0 && (
                                <p className="text-center text-text-muted text-sm pt-4">
                                    — Has llegado al final de las reseñas —
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16 bg-surface-light/5 rounded-2xl border border-white/5 border-dashed">
                            <MessageSquare className="w-14 h-14 text-gray-600 mx-auto mb-4 opacity-50" />
                            <p className="text-gray-400 font-medium text-lg">
                                Aún no hay reseñas
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                ¡Sé el primero en compartir tu opinión!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* Modal: nickname requerido para publicar reseñas */}
        {showNicknameModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowNicknameModal(false)}
                    aria-hidden
                />
                <div className="relative w-full max-w-sm rounded-2xl border border-surface-light/50 bg-surface/95 backdrop-blur-xl p-6 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <User className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Necesitas un nickname</h3>
                    <p className="text-text-secondary text-sm mb-6">
                        Para publicar una reseña necesitas configurar un nickname en tu perfil. Solo toma un momento.
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowNicknameModal(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-surface-light hover:bg-surface-light/30 transition-colors text-text-primary font-medium"
                        >
                            Ahora no
                        </button>
                        <a
                            href="/settings"
                            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-black hover:bg-primary-hover transition-colors font-semibold text-center text-sm"
                        >
                            Ir a Ajustes
                        </a>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}