import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashRoomPassword } from '@/lib/watch-party-crypto';

// ── POST /api/watch-party — create a party ────────────────────────────────────
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { tmdb_id, title, poster_path, media_type, season, episode, name, is_private, password } = body;

    if (!tmdb_id || !title || !media_type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Hash the room password before storing — never persist plaintext.
    const passwordHash = (is_private && password)
        ? await hashRoomPassword(password)
        : null;

    // Generate unique 6-char room code
    const room_code = Math.random().toString(36).slice(2, 8).toUpperCase();

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

    const { data, error } = await supabase
        .from('parties')
        .select('id, room_code, title, poster_path, media_type, season, episode, name, status, host_id, created_at, party_members(count)')
        .eq('is_private', false)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ parties: data ?? [] });
}
