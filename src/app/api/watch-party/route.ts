import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { hashRoomPassword } from '@/lib/watch-party-crypto';
import { cleanupInactiveParties } from '@/lib/watch-party-cleanup';
import { randomBytes } from 'crypto';

/** Throttle de la limpieza al listar salas: no más de una vez cada 30s para
 *  todo el proceso (evita correrla en cada request del lobby). */
let lastCleanupAt = 0;
const CLEANUP_THROTTLE_MS = 30_000;

/** SEC-019: cryptographically secure room code — avoids Math.random() which is
 *  not a CSPRNG and produces only ~2.1B combinations, brute-forceable in minutes.
 *  Uses an unambiguous alphabet (no 0/O, 1/I/L) for better UX. */
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(6);
    return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ── POST /api/watch-party — create a party ────────────────────────────────────
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // .catch evita un 500 si el body llega vacío o no es JSON válido.
    const body = await req.json().catch(() => ({}));
    const { tmdb_id, title, poster_path, media_type, season, episode, name, is_private, password } = body;

    if (!tmdb_id || !title || !media_type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SEC-022: limit active parties per user to prevent DoS via table flooding.
    const { count: activeCount } = await supabase
        .from('parties')
        .select('id', { count: 'exact', head: true })
        .eq('host_id', user.id)
        .neq('status', 'finished');

    if ((activeCount ?? 0) >= 3) {
        return NextResponse.json(
            { error: 'Límite de salas activas alcanzado (máximo 3)' },
            { status: 429 }
        );
    }

    // Hash the room password before storing — never persist plaintext.
    const passwordHash = (is_private && password)
        ? await hashRoomPassword(password)
        : null;

    // SEC-019: use CSPRNG-based room code instead of Math.random()
    const room_code = generateRoomCode();

    const { data: party, error } = await supabase
        .from('parties')
        .insert({
            tmdb_id,
            title,
            poster_path:   poster_path ?? null,
            media_type,
            season:        season ?? null,
            episode:       episode ?? null,
            host_id:       user.id,
            name:          name || 'Sala de Cine',
            is_private:    is_private ?? false,
            password:      passwordHash,
            room_code,
            status:        'waiting',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-join host
    await supabase.from('party_members').insert({
        party_id: party.id,
        user_id:  user.id,
        is_ready: false,
    });

    // Never return the password hash to the client.
    const { password: _omit, ...safeParty } = party;
    return NextResponse.json({ party: safeParty });
}

// ── GET /api/watch-party — list public parties ────────────────────────────────
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Limpieza oportunista (con throttle global) para que las salas muertas
    // desaparezcan al abrir el lobby, sin esperar al cron diario.
    const now = Date.now();
    if (now - lastCleanupAt > CLEANUP_THROTTLE_MS) {
        lastCleanupAt = now;
        try { await cleanupInactiveParties(); } catch { /* no bloquear el listado */ }
    }

    // El conteo de participantes se calcula sobre miembros con heartbeat
    // reciente (activos AHORA), no sobre el total de filas — así el lobby no
    // muestra "2 personas" en salas donde ya no hay nadie conectado.
    const admin = createServiceRoleClient();
    const activeCutoff = new Date(now - 2 * 60 * 1000).toISOString();

    const { data, error } = await admin
        .from('parties')
        .select('id, room_code, title, poster_path, media_type, season, episode, name, status, host_id, is_private, created_at, party_members(user_id, online_at)')
        .eq('is_private', false)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mapear: contar solo miembros activos y ocultar salas sin nadie conectado.
    const parties = (data ?? [])
        .map((p) => {
            const members = Array.isArray(p.party_members) ? p.party_members : [];
            const activeCount = members.filter(
                (m: { online_at: string | null }) => m.online_at && m.online_at > activeCutoff
            ).length;
            // Reformatear party_members al shape {count} que espera el cliente.
            const { party_members: _omit, ...rest } = p;
            return { ...rest, party_members: [{ count: activeCount }], _activeCount: activeCount };
        })
        // Solo salas con al menos un participante activo.
        .filter((p) => p._activeCount > 0)
        .slice(0, 20)
        .map(({ _activeCount, ...p }) => p);

    return NextResponse.json({ parties });
}
