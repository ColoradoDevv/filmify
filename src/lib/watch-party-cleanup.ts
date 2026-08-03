/**
 * Limpieza de salas muertas y miembros fantasma — en TypeScript (service role).
 *
 * No depende de la función SQL `cleanup_inactive_parties` (que requiere
 * aplicar DDL manualmente). Replica su lógica con el cliente de service role,
 * basándose en `online_at` (heartbeat real) en vez de la mera existencia de
 * filas de party_members.
 *
 * Se invoca desde el cron diario y, de forma ligera y con throttle, al cargar
 * el lobby — así las salas vacías desaparecen en ~2 min sin esperar al cron.
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

/** Sin heartbeat en este tiempo → el miembro se considera desconectado. */
const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;     // 2 min (cliente late cada 20s)
/** Margen tras crear la sala antes de poder finalizarla por estar vacía. */
const GRACE_MS            = 60 * 1000;          // 1 min
/** Salas finalizadas más viejas que esto se borran. */
const FINISHED_TTL_MS     = 60 * 60 * 1000;     // 1 h

export interface CleanupResult {
    purgedMembers: number;
    finishedRooms: number;
    deletedRooms: number;
}

export async function cleanupInactiveParties(): Promise<CleanupResult> {
    const admin = createServiceRoleClient();
    const now = Date.now();
    const result: CleanupResult = { purgedMembers: 0, finishedRooms: 0, deletedRooms: 0 };

    // 1) Purgar miembros fantasma (sin heartbeat reciente).
    //    NOTA: se hace en dos DELETE simples en lugar de un `.or(...)` porque
    //    PostgREST no resuelve el nombre de columna dentro de `.or()` sobre un
    //    DELETE (falla con "column ... does not exist"). Los filtros simples sí.
    const presenceCutoff = new Date(now - PRESENCE_TIMEOUT_MS).toISOString();
    const { data: staleGhosts } = await admin
        .from('party_members')
        .delete()
        .lt('online_at', presenceCutoff)
        .select('id');
    const { data: nullGhosts } = await admin
        .from('party_members')
        .delete()
        .is('online_at', null)
        .select('id');
    result.purgedMembers = (staleGhosts?.length ?? 0) + (nullGhosts?.length ?? 0);

    // 2) Finalizar salas activas que se quedaron sin ningún miembro.
    const graceCutoff = new Date(now - GRACE_MS).toISOString();
    const { data: activeParties } = await admin
        .from('parties')
        .select('id, created_at, status, party_members(count)')
        .neq('status', 'finished');

    const emptyRoomIds = (activeParties ?? [])
        .filter((p) => {
            const count = Array.isArray(p.party_members) ? (p.party_members[0]?.count ?? 0) : 0;
            return count === 0 && p.created_at < graceCutoff;
        })
        .map((p) => p.id);

    if (emptyRoomIds.length > 0) {
        const { data: finished } = await admin
            .from('parties')
            .update({ status: 'finished', ended_at: new Date(now).toISOString() })
            .in('id', emptyRoomIds)
            .select('id');
        result.finishedRooms = finished?.length ?? 0;
    }

    // 3) Borrar salas finalizadas viejas (libera el código de sala).
    const finishedCutoff = new Date(now - FINISHED_TTL_MS).toISOString();
    const { data: deleted } = await admin
        .from('parties')
        .delete()
        .eq('status', 'finished')
        .lt('created_at', finishedCutoff)
        .select('id');
    result.deletedRooms = deleted?.length ?? 0;

    return result;
}
