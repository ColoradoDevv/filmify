import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/** Sin latido durante este tiempo, el host se considera ausente. */
const HOST_STALE_MS = 90_000;

/**
 * POST /api/watch-party/[code]/claim-host — tomar el control de una sala
 * cuyo host desapareció (cerró la pestaña, perdió conexión).
 *
 * Reglas verificadas server-side:
 *  - El solicitante debe ser miembro de la sala.
 *  - El host actual debe llevar > 90s sin latido (online_at), o haber
 *    abandonado la tabla de miembros.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createServiceRoleClient();
    const { data: party } = await admin
        .from('parties')
        .select('id, host_id, status')
        .eq('room_code', code.toUpperCase())
        .single();

    if (!party) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (party.status === 'finished') return NextResponse.json({ error: 'La sala ya terminó' }, { status: 410 });
    if (party.host_id === user.id) return NextResponse.json({ ok: true, alreadyHost: true });

    // Solicitante debe ser miembro.
    const { data: requester } = await admin
        .from('party_members')
        .select('user_id')
        .eq('party_id', party.id)
        .eq('user_id', user.id)
        .maybeSingle();
    if (!requester) return NextResponse.json({ error: 'No eres miembro de esta sala' }, { status: 403 });

    // ¿El host sigue vivo?
    const { data: hostMember } = await admin
        .from('party_members')
        .select('online_at')
        .eq('party_id', party.id)
        .eq('user_id', party.host_id)
        .maybeSingle();

    const hostAlive = hostMember?.online_at
        ? Date.now() - new Date(hostMember.online_at).getTime() < HOST_STALE_MS
        : false;

    if (hostAlive) {
        return NextResponse.json({ error: 'El host sigue conectado' }, { status: 409 });
    }

    const { error } = await admin
        .from('parties')
        .update({ host_id: user.id })
        .eq('id', party.id)
        // Guard de carrera: solo si nadie lo reclamó antes.
        .eq('host_id', party.host_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: profile } = await admin
        .from('profiles').select('username').eq('id', user.id).single();
    await admin.from('party_messages').insert({
        party_id: party.id,
        user_id: user.id,
        text: `👑 ${profile?.username ?? 'Alguien'} tomó el control de la sala (host ausente)`,
        type: 'system',
    });

    return NextResponse.json({ ok: true, newHostId: user.id });
}
