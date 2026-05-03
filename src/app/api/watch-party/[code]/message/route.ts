import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/watch-party/[code]/message — send a chat message ───────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { text } = await req.json();
    if (!text?.trim() || text.length > 500) {
        return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const { data: party } = await supabase
        .from('parties')
        .select('id')
        .eq('room_code', code.toUpperCase())
        .single();

    if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Verify user is a member
    const { data: member } = await supabase
        .from('party_members')
        .select('user_id')
        .eq('party_id', party.id)
        .eq('user_id', user.id)
        .single();

    if (!member) return NextResponse.json({ error: 'No eres miembro de esta sala' }, { status: 403 });

    const { error } = await supabase
        .from('party_messages')
        .insert({ party_id: party.id, user_id: user.id, text: text.trim(), type: 'user' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
