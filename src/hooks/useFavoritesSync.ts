'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { loadFavoritesFromSupabase, saveFavoritesToSupabase, mergeFavorites } from '@/lib/supabase/favorites';
import { useStore } from '@/lib/store/useStore';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export default function useFavoritesSync() {
    const setFavorites = useStore((state) => state.setFavorites);
    const favorites = useStore((state) => state.user.favorites);
    const favoritesRef = useRef(favorites);

    useEffect(() => {
        favoritesRef.current = favorites;
    }, [favorites]);

    useEffect(() => {
        const supabase = createClient();
        let mounted = true;

        const syncFavorites = async () => {
            try {
                const serverFavorites = await loadFavoritesFromSupabase();
                if (!mounted) return;

                const mergedFavorites = mergeFavorites(serverFavorites, favoritesRef.current);
                setFavorites(mergedFavorites);

                if (mergedFavorites.length > serverFavorites.length) {
                    await saveFavoritesToSupabase(mergedFavorites);
                }
            } catch (error) {
                console.error('Error syncing favorites with Supabase:', error);
            }
        };

        syncFavorites();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            if (session?.user) {
                syncFavorites();
            }
            // Al cerrar sesión NO se limpian: la lista local (persistida)
            // es del dispositivo, no de la cuenta — vaciarla borraba los
            // favoritos anónimos. Solo se deja de sincronizar.
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [setFavorites]);
}
