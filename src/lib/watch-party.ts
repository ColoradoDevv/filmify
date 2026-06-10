/**
 * Watch Party — client-side helpers and Realtime subscriptions.
 * All DB mutations go through API routes to keep service-role key server-side.
 *
 * IMPORTANT: All functions share the same supabase singleton so Realtime
 * channels don't get orphaned across different client instances.
 */
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Party, PartyMember, ChatMessage } from '@/types/watch-party';

export type { Party, PartyMember, ChatMessage };

// ── Singleton ─────────────────────────────────────────────────────────────────

/** Cliente Supabase único para evitar múltiples conexiones GoTrue/Realtime. */
const supabase = createClient();

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_MESSAGES = 200;
const DEBUG = process.env.NODE_ENV === 'development';

// ── Helpers de transformación ─────────────────────────────────────────────────

/** Convierte una fila de party_messages (con perfil) a ChatMessage. */
function toChatMessage(row: any): ChatMessage {
    return {
        id:             row.id,
        user_id:        row.user_id,
        username:       row.profiles?.username ?? row.username ?? 'Usuario',
        avatar_url:     row.profiles?.avatar_url ?? row.avatar_url ?? null,
        text:           row.text,
        timestamp:      row.created_at,
        type:           row.type ?? 'user',
        reply_to_id:    row.reply_to_id    ?? null,
        reply_preview:  row.reply_preview  ?? null,
        reply_username: row.reply_username ?? null,
    };
}

/** Convierte una fila de party_members (con perfil) a PartyMember. */
function toPartyMember(row: any): PartyMember {
    return {
        user_id:    row.user_id,
        username:   row.profiles?.username ?? row.username ?? 'Usuario',
        avatar_url: row.profiles?.avatar_url ?? row.avatar_url ?? null,
        is_host:    false, // se establece fuera comparando con party.host_id
        is_ready:   row.is_ready ?? false,
        online_at:  row.online_at,
    };
}

// ── Fetch (con manejo de errores) ─────────────────────────────────────────────

export async function getPartyByCode(code: string): Promise<Party | null> {
    try {
        const { data, error } = await supabase
            .from('parties')
            .select('*')
            .eq('room_code', code.toUpperCase())
            .single();

        if (error) {
            if (DEBUG) console.error('[watch-party] getPartyByCode error:', error);
            return null;
        }
        return data as Party | null;
    } catch (err) {
        if (DEBUG) console.error('[watch-party] getPartyByCode unexpected:', err);
        return null;
    }
}

export async function getPublicParties(): Promise<Party[]> {
    try {
        const { data, error } = await supabase
            .from('parties')
            .select('*, party_members(count)')
            .eq('is_private', false)
            .neq('status', 'finished')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            if (DEBUG) console.error('[watch-party] getPublicParties error:', error);
            return [];
        }
        return (data ?? []) as Party[];
    } catch (err) {
        if (DEBUG) console.error('[watch-party] getPublicParties unexpected:', err);
        return [];
    }
}

export async function getPartyMessages(
    partyId: string,
    limit: number = MAX_MESSAGES,
): Promise<ChatMessage[]> {
    try {
        const { data, error } = await supabase
            .from('party_messages')
            .select('id, user_id, text, type, created_at, reply_to_id, reply_preview, reply_username, profiles:user_id(username, avatar_url)')
            .eq('party_id', partyId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            if (DEBUG) console.error('[watch-party] getPartyMessages error:', error);
            return [];
        }
        return (data ?? []).map(toChatMessage);
    } catch (err) {
        if (DEBUG) console.error('[watch-party] getPartyMessages unexpected:', err);
        return [];
    }
}

export async function getPartyMembers(partyId: string): Promise<PartyMember[]> {
    try {
        const { data, error } = await supabase
            .from('party_members')
            .select('user_id, is_ready, online_at, profiles:user_id(username, avatar_url)')
            .eq('party_id', partyId);

        if (error) {
            if (DEBUG) console.error('[watch-party] getPartyMembers error:', error);
            return [];
        }
        return (data ?? []).map(toPartyMember);
    } catch (err) {
        if (DEBUG) console.error('[watch-party] getPartyMembers unexpected:', err);
        return [];
    }
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

/**
 * Suscripción a cambios en la party (UPDATE).
 * Retorna el canal para que el consumidor pueda desuscribirse.
 */
export function subscribeToParty(
    partyId: string,
    onPartyChange: (party: Partial<Party>) => void,
): RealtimeChannel {
    return supabase
        .channel(`party:${partyId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'parties',
            filter: `id=eq.${partyId}`,
        }, (payload: { new: Record<string, unknown> }) => {
            onPartyChange(payload.new as Partial<Party>);
        })
        .subscribe();
}

/**
 * Suscripción a cambios en miembros (INSERT / DELETE).
 * Los callbacks reciben la fila cruda para que el consumidor la transforme.
 */
export function subscribeToMembers(
    partyId: string,
    onInsert: (row: any) => void,
    onDelete: (row: any) => void,
): RealtimeChannel {
    return supabase
        .channel(`members:${partyId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'party_members',
            filter: `party_id=eq.${partyId}`,
        }, (payload: { new: Record<string, unknown> }) => onInsert(payload.new))
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'party_members',
            filter: `party_id=eq.${partyId}`,
        }, (payload: { old: Record<string, unknown> }) => onDelete(payload.old))
        .subscribe();
}

/**
 * Suscripción a nuevos mensajes (INSERT).
 * Incluye join con profiles para obtener username/avatar_url sin consultas extra.
 */
export function subscribeToMessages(
    partyId: string,
    onMessage: (msg: ChatMessage) => void,
): RealtimeChannel {
    return supabase
        .channel(`messages:${partyId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'party_messages',
            filter: `party_id=eq.${partyId}`,
        }, (payload: { new: Record<string, unknown> }) => {
            // La suscripción no incluye la relación profiles automáticamente,
            // pero podemos hacer un fetch rápido solo para ese usuario.
            // Alternativa: incluir username/avatar en el payload con un trigger DB.
            // Por ahora, hacemos la consulta mínima.
            fetchProfileAndBuildMessage(payload.new).then(onMessage);
        })
        .subscribe();
}

/** Obtiene el perfil de un usuario y construye el ChatMessage. */
async function fetchProfileAndBuildMessage(row: Record<string, unknown>): Promise<ChatMessage> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', row.user_id)
            .single();

        return toChatMessage({
            ...row,
            profiles: profile ?? { username: 'Usuario', avatar_url: null },
        });
    } catch {
        return toChatMessage(row);
    }
}

// ── Limpieza de canales ──────────────────────────────────────────────────────

/** Elimina un canal específico de Supabase Realtime. */
export function removeChannel(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
}

/**
 * Elimina todos los canales cuyos nombres comiencen con el prefijo dado.
 * Útil para limpiar suscripciones al desmontar una sala.
 */
export async function removeChannelsByPrefix(prefix: string): Promise<void> {
    const channels = supabase.getChannels();
    channels.forEach((ch: RealtimeChannel) => {
        if (ch.topic.startsWith(prefix)) {
            supabase.removeChannel(ch);
        }
    });
}

/** Elimina TODOS los canales de Watch Party (prefijos: party:, members:, messages:). */
export async function removeAllWatchPartyChannels(): Promise<void> {
    const channels = supabase.getChannels();
    channels.forEach((ch: RealtimeChannel) => {
        if (ch.topic.startsWith('party:') || ch.topic.startsWith('members:') || ch.topic.startsWith('messages:')) {
            supabase.removeChannel(ch);
        }
    });
}

// ── Cliente compartido ───────────────────────────────────────────────────────

export { supabase as watchPartyClient };