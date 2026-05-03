/**
 * Watch Party — client-side helpers and Realtime subscriptions.
 * All DB mutations go through API routes to keep service-role key server-side.
 */
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Party, PartyMember, ChatMessage } from '@/types/watch-party';

export type { Party, PartyMember, ChatMessage };

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function getPartyByCode(code: string): Promise<Party | null> {
    const supabase = createClient();
    const { data } = await supabase
        .from('parties')
        .select('*, party_members(count)')
        .eq('room_code', code.toUpperCase())
        .single();
    return data as Party | null;
}

export async function getPublicParties(): Promise<Party[]> {
    const supabase = createClient();
    const { data } = await supabase
        .from('parties')
        .select('*, party_members(count)')
        .eq('is_private', false)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(20);
    return (data ?? []) as Party[];
}

export async function getPartyMessages(partyId: string): Promise<ChatMessage[]> {
    const supabase = createClient();
    const { data } = await supabase
        .from('party_messages')
        .select('id, user_id, text, type, created_at, reply_to_id, reply_preview, profiles:user_id(username, avatar_url)')
        .eq('party_id', partyId)
        .order('created_at', { ascending: true })
        .limit(200);

    return (data ?? []).map((m: any) => ({
        id:            m.id,
        user_id:       m.user_id,
        username:      m.profiles?.username ?? 'Usuario',
        avatar_url:    m.profiles?.avatar_url ?? null,
        text:          m.text,
        timestamp:     m.created_at,
        type:          m.type ?? 'user',
        reply_to_id:   m.reply_to_id   ?? null,
        reply_preview: m.reply_preview ?? null,
    }));
}

export async function getPartyMembers(partyId: string): Promise<PartyMember[]> {
    const supabase = createClient();
    const { data } = await supabase
        .from('party_members')
        .select('user_id, is_ready, online_at, profiles:user_id(username, avatar_url)')
        .eq('party_id', partyId);

    return (data ?? []).map((m: any) => ({
        user_id:    m.user_id,
        username:   m.profiles?.username ?? 'Usuario',
        avatar_url: m.profiles?.avatar_url ?? null,
        is_host:    false, // set by caller comparing with party.host_id
        is_ready:   m.is_ready ?? false,
        online_at:  m.online_at,
    }));
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

export function subscribeToParty(
    partyId: string,
    onPartyChange: (party: Partial<Party>) => void,
): RealtimeChannel {
    const supabase = createClient();
    return supabase
        .channel(`party:${partyId}`)
        .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'parties',
            filter: `id=eq.${partyId}`,
        }, (payload) => onPartyChange(payload.new as Partial<Party>))
        .subscribe();
}

export function subscribeToMembers(
    partyId: string,
    onInsert: (row: any) => void,
    onDelete: (row: any) => void,
): RealtimeChannel {
    const supabase = createClient();
    return supabase
        .channel(`members:${partyId}`)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'party_members',
            filter: `party_id=eq.${partyId}`,
        }, (p) => onInsert(p.new))
        .on('postgres_changes', {
            event: 'DELETE', schema: 'public', table: 'party_members',
            filter: `party_id=eq.${partyId}`,
        }, (p) => onDelete(p.old))
        .subscribe();
}

export function subscribeToMessages(
    partyId: string,
    onMessage: (msg: ChatMessage) => void,
): RealtimeChannel {
    const supabase = createClient();
    return supabase
        .channel(`messages:${partyId}`)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'party_messages',
            filter: `party_id=eq.${partyId}`,
        }, async (payload) => {
            const row = payload.new as any;
            // Fetch profile for the new message
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', row.user_id)
                .single();
            onMessage({
                id:            row.id,
                user_id:       row.user_id,
                username:      profile?.username ?? 'Usuario',
                avatar_url:    profile?.avatar_url ?? null,
                text:          row.text,
                timestamp:     row.created_at,
                type:          row.type ?? 'user',
                reply_to_id:   row.reply_to_id   ?? null,
                reply_preview: row.reply_preview ?? null,
            });
        })
        .subscribe();
}
