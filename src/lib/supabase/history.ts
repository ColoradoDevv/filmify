import { createClient } from './client';

export interface SearchHistoryItem {
    id: string;
    query: string;
    created_at: string;
}

export const addToHistory = async (query: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Check if query already exists to avoid duplicates (optional, but good UX)
    // For simplicity, we'll just insert. You could delete old ones if you want unique latest.
    // Let's delete previous same query to keep it "fresh" at the top
    await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id)
        .eq('query', query);

    const { error } = await supabase
        .from('search_history')
        .insert({
            user_id: user.id,
            query: query.trim(),
        });

    if (error) {
        console.error('Error adding to history:', error);
    }
};

export const getHistory = async (limit = 5): Promise<SearchHistoryItem[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }

    return data || [];
};

/**
 * Borra UNA búsqueda reciente.
 *
 * Hasta ahora solo se podía vaciar el historial entero, así que quitar una
 * búsqueda incómoda obligaba a perder las demás. El filtro por `user_id` es
 * redundante con la RLS de la tabla, pero deja explícito que nadie puede
 * borrar el historial de otro aunque adivine el id.
 */
export const removeFromHistory = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error removing history item:', error);
    }
};

export const clearHistory = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error('Error clearing history:', error);
    }
};
