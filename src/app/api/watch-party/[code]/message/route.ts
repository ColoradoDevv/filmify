import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/watch-party/[code]/message — send a chat message ───────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // SEC-010: only accept text and reply_to_id from the client — never trust
    // reply_preview or reply_username from the request body.
    const { text, reply_to_id } = await req.json();
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

    // SEC-010: resolve reply metadata server-side from the DB, never from the client.
    let replyPreview: string | null = null;
    let replyUsername: string | null = null;
    if (reply_to_id) {
        const { data: replyMsg } = await supabase
            .from('party_messages')
            .select('text, user_id, profiles:user_id(username)')
            .eq('id', reply_to_id)
            .eq('party_id', party.id)   // must belong to the same party
            .single();
        if (replyMsg) {
            replyPreview  = typeof replyMsg.text === 'string' ? replyMsg.text.slice(0, 80) : null;
            const profile = Array.isArray(replyMsg.profiles) ? replyMsg.profiles[0] : replyMsg.profiles;
            replyUsername = (profile as { username?: string } | null)?.username ?? null;
        }
    }

    const { error } = await supabase
        .from('party_messages')
        .insert({
            party_id:       party.id,
            user_id:        user.id,
            text:           text.trim(),
            type:           'user',
            reply_to_id:    reply_to_id  ?? null,
            reply_preview:  replyPreview,
            reply_username: replyUsername,
        });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
