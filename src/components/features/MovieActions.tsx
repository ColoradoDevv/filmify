'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Share2, Check, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { saveFavoritesToSupabase } from '@/lib/supabase/favorites';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Movie, TVShow } from '@/types/tmdb';

interface MovieActionsProps {
    movie: Movie | TVShow;
}

export default function MovieActions({ movie }: MovieActionsProps) {
    const router = useRouter();
    const currentFavorites = useStore((state) => state.user.favorites);
    const isFavorite = currentFavorites.some((fav) => fav.id === movie.id);
    const addFavorite = useStore((state) => state.addFavorite);
    const removeFavorite = useStore((state) => state.removeFavorite);

    const [copied, setCopied] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    const toggleFavorite = useCallback(async () => {
        if (favLoading) return; // evitar múltiples clics

        // Favoritos es una función solo para usuarios registrados.
        const { data: { user } } = await createClient().auth.getUser();
        if (!user) {
            toast.info('Inicia sesión para guardar favoritos');
            router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        setFavLoading(true);

        const nextFavorites = isFavorite
            ? currentFavorites.filter((fav) => fav.id !== movie.id)
            : [...currentFavorites, movie as Movie];

        // Actualizar estado local optimista
        if (isFavorite) {
            removeFavorite(movie.id);
        } else {
            addFavorite(movie as Movie);
        }

        try {
            await saveFavoritesToSupabase(nextFavorites);
        } catch (error) {
            // Revertir el cambio local si falla la sincronización
            if (isFavorite) {
                addFavorite(movie as Movie); // re-agregar
            } else {
                removeFavorite(movie.id); // quitar
            }
            console.error('Error al guardar favoritos:', error);
        } finally {
            setFavLoading(false);
        }
    }, [isFavorite, currentFavorites, movie, addFavorite, removeFavorite, favLoading]);

    const handleShare = useCallback(async () => {
        const url = window.location.href;
        const title = 'title' in movie ? movie.title : movie.name;

        // Intentar Web Share API primero (móviles)
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
                return; // éxito, no necesita más feedback
            } catch (err) {
                // El usuario canceló o hubo un error → intentar copiar
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Error al compartir:', err);
                }
            }
        }

        // Fallback: copiar al portapapeles
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (clipErr) {
            console.error('Error al copiar enlace:', clipErr);
            // Último recurso: quizás mostrar un input para copia manual (poco común)
        }
    }, [movie]);

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón Favoritos */}
            <button
                type="button"
                onClick={toggleFavorite}
                disabled={favLoading}
                aria-pressed={isFavorite}
                className={`
                    group relative flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-semibold
                    transition-all duration-200 ease-out
                    disabled:opacity-60 disabled:cursor-not-allowed
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
                    ${
                        isFavorite
                            ? 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/20 active:scale-95'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 active:scale-95'
                    }
                `}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
                {favLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Heart
                        className={`w-4 h-4 transition-transform duration-200 ${
                            isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'group-hover:scale-110'
                        }`}
                    />
                )}
                <span className="hidden sm:inline">
                    {isFavorite ? 'En favoritos' : 'Favoritos'}
                </span>
            </button>

            {/* Botón Compartir */}
            <button
                type="button"
                onClick={handleShare}
                className={`
                    group relative flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-semibold
                    transition-all duration-200 ease-out
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
                    ${
                        copied
                            ? 'bg-green-500/15 border-green-500/40 text-green-300'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 active:scale-95'
                    }
                `}
                aria-label={copied ? 'Enlace copiado' : 'Compartir'}
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                ) : (
                    <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                )}
                <span className="hidden sm:inline">
                    {copied ? '¡Copiado!' : 'Compartir'}
                </span>
            </button>
        </div>
    );
}