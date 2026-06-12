import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRoomPassword } from '@/lib/watch-party-crypto';
import { isMovieAvailableOnVimeus, isSeriesAvailableOnVimeus } from '@/server/services/vimeus';

/**
 * NOTA RLS: party_members solo tiene políticas SELECT/INSERT/DELETE, por lo
 * que cualquier UPDATE (upsert de re-join, heartbeat) falla en silencio con
 * el cliente del usuario. Las mutaciones de este archivo usan el cliente de
 * service role DESPUÉS de validar identidad y permisos explícitamente.
 */

async function getUsername(userId: string): Promise<string> {
    const admin = createServiceRoleClient();
    const { data } = await admin.from('profiles').select('username').eq('id', userId).single();
    return data?.username ?? 'Alguien';
}

async function systemMessage(partyId: string, userId: string, text: string): Promise<void> {
    const admin = createServiceRoleClient();
    await admin.from('party_messages').insert({
        party_id: partyId, user_id: userId, text, type: 'system',
    });
}

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
        .select('id, room_code, tmdb_id, title, poster_path, media_type, season, episode, name, status, host_id, is_private, password, embed_url, created_at')
        .eq('room_code', code.toUpperCase())
        .single();

    if (partyErr || !party) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (party.status === 'finished') return NextResponse.json({ error: 'Esta sala ya terminó' }, { status: 410 });

    // Password check for private rooms — compare against stored hash.
    // El host no necesita contraseña para entrar a su propia sala.
    if (party.is_private && party.password && party.host_id !== user.id) {
        if (!password) {
            return NextResponse.json({ error: 'Esta sala requiere contraseña' }, { status: 403 });
        }
        const valid = await verifyRoomPassword(password, party.password);
        if (!valid) {
            return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 403 });
        }
    }

    const admin = createServiceRoleClient();

    // ¿Primera vez en la sala? (para el mensaje de sistema)
    const { data: existing } = await admin
        .from('party_members')
        .select('user_id')
        .eq('party_id', party.id)
        .eq('user_id', user.id)
        .maybeSingle();

    const { error: joinErr } = await admin
        .from('party_members')
        .upsert(
            { party_id: party.id, user_id: user.id, is_ready: false, online_at: new Date().toISOString() },
            { onConflict: 'party_id,user_id' }
        );

    if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 });

    if (!existing) {
        const username = await getUsername(user.id);
        await systemMessage(party.id, user.id, `${username} se unió a la sala`);
    }

    // Strip the password hash before returning the party object.
    const { password: _omit, ...safeParty } = party;
    return NextResponse.json({ party: safeParty });
}

// ── DELETE /api/watch-party/[code] — leave a party (con traspaso de host) ────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
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

    if (!party) return NextResponse.json({ ok: true });

    // Remove member
    await admin.from('party_members')
        .delete()
        .eq('party_id', party.id)
        .eq('user_id', user.id);

    if (party.host_id === user.id) {
        // El host se va: promover al miembro más antiguo en vez de cerrar la
        // sala. Si no queda nadie, la sala termina.
        const { data: oldest } = await admin
            .from('party_members')
            .select('user_id, joined_at')
            .eq('party_id', party.id)
            .order('joined_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (oldest) {
            await admin.from('parties')
                .update({ host_id: oldest.user_id })
                .eq('id', party.id);
            const username = await getUsername(oldest.user_id);
            await systemMessage(party.id, oldest.user_id, `👑 ${username} ahora es el host`);
            return NextResponse.json({ ok: true, newHostId: oldest.user_id });
        }

        await admin.from('parties')
            .update({ status: 'finished', ended_at: new Date().toISOString() })
            .eq('id', party.id);
    }

    return NextResponse.json({ ok: true });
}

// ── PATCH /api/watch-party/[code] — acciones del host ─────────────────────────
// Body: { action: 'playback' | 'media' | 'status', ... }
// (sin action → comportamiento legado: { status })
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? 'status';

    const admin = createServiceRoleClient();
    const { data: party } = await admin
        .from('parties')
        .select('id, host_id, status, media_type, title')
        .eq('room_code', code.toUpperCase())
        .single();

    if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (party.host_id !== user.id) {
        return NextResponse.json({ error: 'Solo el host puede controlar la sala' }, { status: 403 });
    }

    // ── Persistir estado de reproducción (countdown / playing / paused / idle).
    // Se guarda como JSON en embed_url (columna de texto sin uso) porque añadir
    // columnas requiere DDL; el estado vivo viaja por Realtime broadcast y esto
    // solo sirve para reconstruir el estado al entrar tarde.
    if (action === 'playback') {
        const p = body.playback;
        const VALID_PHASES = ['idle', 'countdown', 'playing', 'paused'];
        if (!p || p.v !== 1 || !VALID_PHASES.includes(p.phase)) {
            return NextResponse.json({ error: 'Invalid playback state' }, { status: 400 });
        }
        // Saneamos: solo persistimos los campos del contrato.
        const clean = {
            v: 1 as const,
            phase: p.phase,
            countdownEndsAt: typeof p.countdownEndsAt === 'number' ? p.countdownEndsAt : undefined,
            seq: typeof p.seq === 'number' ? p.seq : 0,
            at: typeof p.at === 'number' ? p.at : Date.now(),
            by: user.id,
        };
        // El ciclo de vida visible de la sala: idle→waiting, resto→playing.
        const status = clean.phase === 'idle' ? 'waiting' : 'playing';
        const { error } = await admin
            .from('parties')
            .update({ embed_url: JSON.stringify(clean), status })
            .eq('id', party.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
    }

    // ── Cambiar película / episodio (con validación de disponibilidad).
    if (action === 'media') {
        const { tmdb_id, title, poster_path, media_type, season, episode } = body;
        if (!tmdb_id || !title || !['movie', 'tv'].includes(media_type)) {
            return NextResponse.json({ error: 'Datos de título inválidos' }, { status: 400 });
        }

        // Mismo criterio que el catálogo: nunca ofrecer lo que no se puede ver.
        const available = media_type === 'movie'
            ? await isMovieAvailableOnVimeus(Number(tmdb_id)).catch(() => false)
            : await isSeriesAvailableOnVimeus(Number(tmdb_id)).catch(() => false);
        if (!available) {
            return NextResponse.json({ error: 'Ese título no está disponible para reproducir' }, { status: 422 });
        }

        const { error } = await admin
            .from('parties')
            .update({
                tmdb_id: Number(tmdb_id),
                title: String(title).slice(0, 200),
                poster_path: poster_path ?? null,
                media_type,
                season: media_type === 'tv' ? Number(season ?? 1) : null,
                episode: media_type === 'tv' ? Number(episode ?? 1) : null,
                // Cambio de título → la reproducción vuelve a idle hasta que
                // el host vuelva a iniciar.
                embed_url: null,
                status: 'waiting',
            })
            .eq('id', party.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const label = media_type === 'tv'
            ? `${title} — T${season ?? 1}·E${episode ?? 1}`
            : title;
        await systemMessage(party.id, user.id, `🎬 El host puso: ${label}`);
        return NextResponse.json({ ok: true });
    }

    // ── Legado: cambio de status simple (whitelist contra el constraint real).
    const VALID_STATUSES = ['waiting', 'counting', 'playing', 'finished'] as const;
    const status = body.status;
    if (!status || !VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const update: Record<string, unknown> = { status };
    if (status === 'finished') update.ended_at = new Date().toISOString();
    const { error } = await admin.from('parties').update(update).eq('id', party.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
