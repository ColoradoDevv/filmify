import type { Movie } from '@/types/tmdb';
import { getFavorites, saveFavorites } from '@/app/actions/favorites';

/**
 * Favoritos, vistos desde el cliente.
 *
 * El acceso a Supabase se mudó a `@/app/actions/favorites`: los favoritos
 * comparten la columna `profiles.preferences` con los ajustes y las amistades,
 * y hacer el leer-fusionar-guardar desde el navegador dejaba una ventana en la
 * que dos pestañas se pisaban. Este módulo se conserva porque `useFavoritesSync`
 * y el store lo llaman por estos nombres, pero ya no habla con la base de datos.
 */

/**
 * Forma laxa de `profiles.preferences` vista desde los favoritos.
 *
 * Deliberadamente abierta: en esa misma columna conviven los ajustes
 * (`@/lib/user-preferences`, que es la forma canónica), las amistades y los
 * favoritos. El índice de string está para que un merge nunca tire por el
 * camino las claves que este módulo no conoce.
 */
export interface ProfilePreferences {
    favorites?: Movie[];
    [key: string]: any;
}

export async function loadFavoritesFromSupabase(): Promise<Movie[]> {
    const { favorites } = await getFavorites();
    return favorites;
}

export async function saveFavoritesToSupabase(favorites: Movie[]): Promise<void> {
    const { ok, error } = await saveFavorites(favorites);
    if (!ok) {
        console.error('Error saving favorites to Supabase:', error);
    }
}

export function mergeFavorites(baseFavorites: Movie[], incomingFavorites: Movie[]): Movie[] {
    const idMap = new Map<number, Movie>();
    [...baseFavorites, ...incomingFavorites].forEach((movie) => {
        idMap.set(movie.id, movie);
    });
    return Array.from(idMap.values());
}
