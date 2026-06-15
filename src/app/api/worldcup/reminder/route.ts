import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Respuesta por-usuario (depende de la sesión) → nunca cachear.
export const dynamic = 'force-dynamic';

/** GET /api/worldcup/reminder — lista los match_id con recordatorio activo del usuario */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ matchIds: [] });

    const { data, error } = await supabase
        .from('match_reminders')
        .select('match_id')
        .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ matchIds: (data ?? []).map((r: { match_id: string }) => r.match_id) });
}

/** POST /api/worldcup/reminder — guardar recordatorio */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { match_id, kickoff, home_team, away_team, timezone } = await request.json();

    if (!match_id || !kickoff || !home_team || !away_team) {
        return NextResponse.json({ error: 'Faltan datos del partido' }, { status: 400 });
    }
    if (new Date(kickoff).getTime() < Date.now()) {
        return NextResponse.json({ error: 'El partido ya comenzó' }, { status: 400 });
    }

    const { error } = await supabase
        .from('match_reminders')
        .upsert({ user_id: user.id, match_id, kickoff, home_team, away_team, sent: false },
                 { onConflict: 'user_id,match_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Guardar la zona horaria del usuario para que el email use su hora local.
    // Merge sobre las preferencias existentes; validamos que sea una zona IANA real.
    if (typeof timezone === 'string' && isValidTimeZone(timezone)) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single();
        const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
        if (prefs.timezone !== timezone) {
            await supabase
                .from('profiles')
                .update({ preferences: { ...prefs, timezone } })
                .eq('id', user.id);
        }
    }
    return NextResponse.json({ success: true });
}

/** DELETE /api/worldcup/reminder — cancelar recordatorio */
export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { match_id } = await request.json();
    if (!match_id) return NextResponse.json({ error: 'match_id requerido' }, { status: 400 });

    const { error } = await supabase
        .from('match_reminders')
        .delete()
        .eq('user_id', user.id)
        .eq('match_id', match_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

/** Valida que sea una zona IANA real (evita guardar basura del cliente). */
function isValidTimeZone(tz: string): boolean {
    try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}
