/**
 * Watch Party — helpers de cliente para el chat y el cliente compartido.
 *
 * Las mutaciones van por rutas API (la service-role key nunca toca el
 * cliente). La sincronización de sala vive en `watch-party-sync.ts`
 * (Broadcast + Presence). Aquí solo queda el chat, que usa postgres_changes
 * sobre party_messages (verificado funcional en la BD).
 *
 * IMPORTANTE: todas las funciones comparten el mismo singleton de supabase
 * para no dejar canales Realtime huérfanos entre instancias.
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

// ── Mensajes ──────────────────────────────────────────────────────────────────

export async function getPartyMessages(
    partyId: string,
    limit: number = MAX_MESSAGES,
): Promise<ChatMessage[]> {
    try {
        // No usamos el embed `profiles:user_id(...)` de PostgREST: no existe
        // una FK declarada entre party_messages.user_id y profiles.id, así que
        // el embed falla con PGRST200. Resolvemos los perfiles por separado
        // con un único IN — robusto e independiente del esquema.
        const { data, error } = await supabase
            .from('party_messages')
            .select('id, user_id, text, type, created_at, reply_to_id, reply_preview, reply_username')
            .eq('party_id', partyId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            if (DEBUG) console.error('[watch-party] getPartyMessages error:', error);
            return [];
        }

        const rows = (data ?? []) as Array<Record<string, unknown>>;
        const profiles = await fetchProfiles(rows.map((r) => r.user_id as string));
        return rows.map((row) => toChatMessage({ ...row, profiles: profiles.get(row.user_id as string) ?? null }));
    } catch (err) {
        if (DEBUG) console.error('[watch-party] getPartyMessages unexpected:', err);
        return [];
    }
}

/** Trae username/avatar_url de varios usuarios en una sola consulta. */
async function fetchProfiles(
    userIds: string[],
): Promise<Map<string, { username: string | null; avatar_url: string | null }>> {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    const map = new Map<string, { username: string | null; avatar_url: string | null }>();
    if (unique.length === 0) return map;
    const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', unique);
    for (const p of data ?? []) {
        map.set(p.id as string, { username: p.username ?? null, avatar_url: p.avatar_url ?? null });
    }
    return map;
}

/**
 * Suscripción a nuevos mensajes (INSERT).
 * El payload de Realtime no incluye la relación profiles; se resuelve con una
 * consulta mínima por mensaje.
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

// ── Cliente compartido ───────────────────────────────────────────────────────

export { supabase as watchPartyClient };
