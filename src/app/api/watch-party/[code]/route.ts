import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRoomPassword } from '@/lib/watch-party-crypto';

// ── POST /api/watch-party/[code] — join a party ───────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    // Fetch party — explicitly exclude the password hash from the select so it
    // never travels further than this function.
    const { data: party, error: partyErr } = await supabase
        .from('parties')
        .select('id, room_code, title, poster_path, media_type, season, episode, name, status, host_id, is_private, password, created_at')
        .eq('room_code', code.toUpperCase())
        .single();

    if (partyErr || !party) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (party.status === 'finished') return NextResponse.json({ error: 'Esta sala ya terminó' }, { status: 410 });

    // Password check for private rooms — compare against stored hash.
    if (party.is_private && party.password) {
        if (!password) {
            return NextResponse.json({ error: 'Esta sala requiere contraseña' }, { status: 403 });
        }
        const valid = await verifyRoomPassword(password, party.password);
        if (!valid) {
            return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 403 });
        }
    }

    // Upsert member (idempotent)
    const { error: joinErr } = await supabase
        .from('party_members')
        .upsert(
            { party_id: party.id, user_id: user.id, is_ready: false, online_at: new Date().toISOString() },
            { onConflict: 'party_id,user_id' }
        );

    if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 });

    // Strip the password hash before returning the party object.
    const { password: _omit, ...safeParty } = party;
    return NextResponse.json({ party: safeParty });
}

// ── DELETE /api/watch-party/[code] — leave a party ───────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: party } = await supabase
        .from('parties')
        .select('id, host_id')
        .eq('room_code', code.toUpperCase())
        .single();

    if (!party) return NextResponse.json({ ok: true });

    // Remove member
    await supabase.from('party_members')
        .delete()
        .eq('party_id', party.id)
        .eq('user_id', user.id);

    // If host leaves, end the party
    if (party.host_id === user.id) {
        await supabase.from('parties')
            .update({ status: 'finished', ended_at: new Date().toISOString() })
            .eq('id', party.id);
    }

    return NextResponse.json({ ok: true });
}

// ── PATCH /api/watch-party/[code] — update party status (host only) ──────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { status } = body;

    const { data: party } = await supabase
        .from('parties')
        .select('id, host_id')
        .eq('room_code', code.toUpperCase())
        .single();

    if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (party.host_id !== user.id) return NextResponse.json({ error: 'Solo el host puede controlar la sala' }, { status: 403 });

    const { error } = await supabase
        .from('parties')
        .update({ status })
        .eq('id', party.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
