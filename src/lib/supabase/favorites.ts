import { createClient } from './client';
import type { Movie } from '@/types/tmdb';

export interface ProfilePreferences {
    autoplay?: boolean;
    adultContent?: boolean;
    reducedMotion?: boolean;
    language?: string;
    favorites?: Movie[];
    [key: string]: any;
}

function normalizeFavorites(value: unknown): Movie[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is Movie => {
        return (
            item !== null &&
            typeof item === 'object' &&
            'id' in item &&
            typeof (item as any).id === 'number'
        );
    });
}

function uniqueFavorites(favorites: Movie[]): Movie[] {
    const seen = new Map<number, Movie>();
    favorites.forEach((movie) => {
        seen.set(movie.id, movie);
    });
    return Array.from(seen.values());
}

export async function loadFavoritesFromSupabase(): Promise<Movie[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error loading favorites from Supabase:', error);
        return [];
    }

    return normalizeFavorites(data?.preferences?.favorites);
}

export async function saveFavoritesToSupabase(favorites: Movie[]): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error reading profile preferences:', error);
        return;
    }

    const existingPreferences = (data?.preferences ?? {}) as ProfilePreferences;
    const updatedPreferences: ProfilePreferences = {
        ...existingPreferences,
        favorites: uniqueFavorites(favorites),
    };

    const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, preferences: updatedPreferences }, { onConflict: 'id' });

    if (updateError) {
        console.error('Error saving favorites to Supabase:', updateError);
    }
}

export function mergeFavorites(baseFavorites: Movie[], incomingFavorites: Movie[]): Movie[] {
    const idMap = new Map<number, Movie>();
    [...baseFavorites, ...incomingFavorites].forEach((movie) => {
        idMap.set(movie.id, movie);
    });
    return Array.from(idMap.values());
}
