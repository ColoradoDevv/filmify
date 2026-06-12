import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/watch-party/[code]/heartbeat — latido de presencia.
 *
 * Actualiza party_members.online_at del propio usuario. Va por API con
 * service role porque party_members no tiene política RLS de UPDATE (el
 * update directo desde el cliente falla en silencio). El online_at sirve
 * para que "reclamar host" pueda verificar que el host real está ausente.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createServiceRoleClient();
    const { data: party } = await admin
        .from('parties')
        .select('id')
        .eq('room_code', code.toUpperCase())
        .single();
    if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await admin
        .from('party_members')
        .update({ online_at: new Date().toISOString() })
        .eq('party_id', party.id)
        .eq('user_id', user.id);

    return NextResponse.json({ ok: true });
}
