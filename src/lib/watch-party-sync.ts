/**
 * Watch Party — capa de sincronización en tiempo real.
 *
 * Arquitectura: Supabase Realtime **Broadcast + Presence** en un único canal
 * por sala (`wp:{partyId}`). Se eligió broadcast en lugar de postgres_changes
 * porque (verificado empíricamente) la tabla `parties` no está en la
 * publicación de Realtime y añadirla requiere DDL; broadcast además tiene
 * menor latencia y trae Presence gratis (lista de conectados en vivo,
 * detección instantánea de salida del host).
 *
 * Persistencia: el estado de reproducción se guarda como JSON en la columna
 * `parties.embed_url` (texto, sin uso desde que el player construye su propia
 * URL). Así los que entran tarde reconstruyen el estado sin esperar un evento.
 *
 * Restricción del reproductor: el embed de Vimeus es un iframe de terceros
 * sin API de control documentada. La sincronización es a nivel de SESIÓN:
 * - Inicio sincronizado con cuenta atrás (todos montan el iframe a la vez).
 * - Pausa = desmontar el iframe en todos (telón) — garantiza que nadie sigue.
 * - Reanudar = remontar con cuenta atrás corta (Vimeus recuerda la posición
 *   localmente en la mayoría de los casos).
 * - Posición del host: best-effort vía postMessage del embed (si emite).
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { watchPartyClient } from '@/lib/watch-party';
import type { Party } from '@/types/watch-party';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type PlaybackPhase = 'idle' | 'countdown' | 'playing' | 'paused';

export interface PlaybackState {
    v: 1;
    phase: PlaybackPhase;
    /** epoch ms en que termina la cuenta atrás (solo phase=countdown) */
    countdownEndsAt?: number;
    /** tras la cuenta atrás se pasa a esta fase (playing) */
    seq: number;
    /** epoch ms de la última transición — para descartar eventos viejos */
    at: number;
    /** host que emitió el estado (defensa básica contra eventos espurios) */
    by: string;
}

export interface MediaChange {
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    media_type: 'movie' | 'tv';
    season: number | null;
    episode: number | null;
}

export interface PresenceMeta {
    user_id: string;
    username: string;
    avatar_url: string | null;
    online_at: string;
}

export interface ReactionEvent {
    emoji: string;
    username: string;
}

/** Posición aproximada del host (best-effort, solo si Vimeus emite eventos). */
export interface HostPositionEvent {
    seconds: number;
    at: number;
}

export type SyncHandlers = {
    onPlayback?: (state: PlaybackState) => void;
    onMedia?: (media: MediaChange) => void;
    onReaction?: (r: ReactionEvent) => void;
    onHostChange?: (newHostId: string) => void;
    onHostPosition?: (p: HostPositionEvent) => void;
    onPresenceSync?: (members: PresenceMeta[]) => void;
    /** El host finalizó la sala para todos. */
    onEnded?: () => void;
};

// ── Codec de persistencia (parties.embed_url) ────────────────────────────────

export const IDLE_PLAYBACK: PlaybackState = { v: 1, phase: 'idle', seq: 0, at: 0, by: '' };

export function parsePlayback(raw: string | null | undefined): PlaybackState {
    if (!raw) return IDLE_PLAYBACK;
    try {
        const p = JSON.parse(raw);
        if (p && p.v === 1 && typeof p.phase === 'string') return p as PlaybackState;
    } catch { /* embed_url con contenido legado — ignorar */ }
    return IDLE_PLAYBACK;
}

export function encodePlayback(state: PlaybackState): string {
    return JSON.stringify(state);
}

/** Si una cuenta atrás persistida ya venció (p. ej. para quien entra tarde),
 *  la fase efectiva es 'playing'. */
export function effectivePhase(state: PlaybackState): PlaybackPhase {
    if (state.phase === 'countdown' && (state.countdownEndsAt ?? 0) <= Date.now()) {
        return 'playing';
    }
    return state.phase;
}

// ── Canal de sala ─────────────────────────────────────────────────────────────

export interface RoomChannel {
    channel: RealtimeChannel;
    sendPlayback: (s: PlaybackState) => void;
    sendMedia: (m: MediaChange) => void;
    sendReaction: (r: ReactionEvent) => void;
    sendHostChange: (newHostId: string) => void;
    sendHostPosition: (p: HostPositionEvent) => void;
    sendEnded: () => void;
    leave: () => void;
}

/**
 * Une al canal de la sala: presencia + broadcast.
 * `self` se anuncia en presence; los handlers reciben los eventos del resto.
 */
export function joinRoomChannel(
    partyId: string,
    self: PresenceMeta,
    handlers: SyncHandlers,
): RoomChannel {
    const supabase = watchPartyClient;
    const channel: RealtimeChannel = supabase.channel(`wp:${partyId}`, {
        config: {
            broadcast: { self: false },
            presence: { key: self.user_id },
        },
    });

    type BroadcastMsg = { payload?: unknown };

    channel
        .on('broadcast', { event: 'playback' }, (msg: BroadcastMsg) => {
            handlers.onPlayback?.(msg.payload as PlaybackState);
        })
        .on('broadcast', { event: 'media' }, (msg: BroadcastMsg) => {
            handlers.onMedia?.(msg.payload as MediaChange);
        })
        .on('broadcast', { event: 'reaction' }, (msg: BroadcastMsg) => {
            handlers.onReaction?.(msg.payload as ReactionEvent);
        })
        .on('broadcast', { event: 'host' }, (msg: BroadcastMsg) => {
            handlers.onHostChange?.((msg.payload as { hostId: string }).hostId);
        })
        .on('broadcast', { event: 'host-pos' }, (msg: BroadcastMsg) => {
            handlers.onHostPosition?.(msg.payload as HostPositionEvent);
        })
        .on('broadcast', { event: 'ended' }, () => {
            handlers.onEnded?.();
        })
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState() as Record<string, PresenceMeta[]>;
            const members = Object.values(state)
                .map((metas) => metas[0])
                .filter(Boolean);
            handlers.onPresenceSync?.(members);
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await channel.track(self);
            }
        });

    const send = (event: string, payload: unknown) => {
        channel.send({ type: 'broadcast', event, payload });
    };

    return {
        channel,
        sendPlayback: (s) => send('playback', s),
        sendMedia: (m) => send('media', m),
        sendReaction: (r) => send('reaction', r),
        sendHostChange: (hostId) => send('host', { hostId }),
        sendHostPosition: (p) => send('host-pos', p),
        sendEnded: () => send('ended', {}),
        leave: () => { supabase.removeChannel(channel); },
    };
}

// ── Acciones del host (broadcast + persistencia vía API) ────────────────────

/** Persiste el estado en el servidor (host-only, validado server-side). */
async function persistPlayback(code: string, state: PlaybackState): Promise<void> {
    try {
        await fetch(`/api/watch-party/${code}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'playback', playback: state }),
        });
    } catch { /* el broadcast ya salió; la persistencia es para late joiners */ }
}

export function makeHostActions(
    code: string,
    room: RoomChannel,
    hostId: string,
    getSeq: () => number,
) {
    const emit = (partial: Omit<PlaybackState, 'v' | 'seq' | 'at' | 'by'>) => {
        const state: PlaybackState = {
            v: 1, ...partial, seq: getSeq() + 1, at: Date.now(), by: hostId,
        };
        room.sendPlayback(state);
        void persistPlayback(code, state);
        return state;
    };

    return {
        /** Inicio (o re-sincronización): cuenta atrás de `seconds` y a reproducir. */
        startCountdown: (seconds = 5) =>
            emit({ phase: 'countdown', countdownEndsAt: Date.now() + seconds * 1000 }),
        /** Confirma fase playing (la emite el host cuando su countdown llega a 0). */
        confirmPlaying: () => emit({ phase: 'playing' }),
        pause: () => emit({ phase: 'paused' }),
        /** Reanudar con cuenta atrás corta para que todos remonten a la vez. */
        resume: (seconds = 3) =>
            emit({ phase: 'countdown', countdownEndsAt: Date.now() + seconds * 1000 }),
        stop: () => emit({ phase: 'idle' }),
    };
}

export type HostActions = ReturnType<typeof makeHostActions>;

// ── Posición del host (best-effort desde el iframe de Vimeus) ───────────────

/**
 * Escucha postMessage del embed de Vimeus buscando eventos de tiempo.
 * Si el proveedor no emite nada reconocible, simplemente nunca llama a `cb`.
 * Devuelve cleanup.
 */
export function listenVimeusTime(cb: (seconds: number) => void): () => void {
    const handler = (e: MessageEvent) => {
        if (typeof e.origin !== 'string' || !e.origin.includes('vimeus.com')) return;
        const d = e.data as Record<string, unknown> | string;
        if (!d || typeof d === 'string') return;
        const candidates = [
            (d as Record<string, unknown>).currentTime,
            (d as Record<string, unknown>).time,
            (d as Record<string, unknown>).position,
            ((d as Record<string, unknown>).data as Record<string, unknown> | undefined)?.currentTime,
        ];
        for (const c of candidates) {
            const n = typeof c === 'string' ? parseFloat(c) : c;
            if (typeof n === 'number' && isFinite(n) && n > 0) { cb(n); return; }
        }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}

/** Formatea segundos como H:MM:SS / M:SS. */
export function formatTime(totalSeconds: number): string {
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── Util ──────────────────────────────────────────────────────────────────────

export function playbackFromParty(party: Party): PlaybackState {
    return parsePlayback(party.embed_url);
}
