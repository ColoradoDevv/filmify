/**
 * Cron: seed real notifications for all users.
 *
 * Triggered daily (e.g. via Vercel Cron or an external scheduler).
 * Secured with the same CRON_SECRET used by the cleanup cron.
 *
 * What it does:
 *  1. Fetches "Now Playing" and "Upcoming" movies from TMDB (real data, no AI hallucination)
 *  2. Inserts one "newRelease" notification per user for each new title
 *     (skips titles already notified in the last 7 days to avoid duplicates)
 *  3. Inserts one "news" system notification with a weekly trending summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient as createServiceRoleClient } from '@/server/repositories/supabase';
import { getOptionalApiKeys } from '@/lib/env';
import { getNowPlaying, getUpcoming, getTrending, getImageUrl } from '@/server/services/tmdb';
import { normalizePreferences } from '@/lib/user-preferences';
import { filterAvailableMovies } from '@/server/services/vimeus';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    const { cronSecret } = getOptionalApiKeys();
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServiceRoleClient();

    try {
        // ── 1. Fetch real movie data from TMDB ───────────────────────────────
        const [nowPlaying, upcoming, trending] = await Promise.all([
            getNowPlaying(1),
            getUpcoming(1),
            getTrending('movie', 'week', 1),
        ]);

        // Solo se notifica lo que se puede VER.
        //
        // Antes se cogían los 3 primeros de TMDB sin más, así que el aviso podía
        // llevar a un título sin fuentes — y /movie/[id] hace notFound() cuando
        // no es reproducible. El caso peor era "Próximamente": una película sin
        // estrenar no está en ningún proveedor, así que ese aviso llevaba SIEMPRE
        // a un 404. Es además lo contrario de lo que hace el resto del sitio,
        // que no anuncia contenido que el visitante no pueda ver.
        //
        // El filtro va ANTES de recortar: si se recorta primero, se descartan
        // candidatos buenos y quedan huecos. Sondear ~40 títulos es caro, pero
        // esto corre una vez al día.
        const seen = new Set<number>();
        const releaseCandidates = [...nowPlaying.results, ...upcoming.results]
            .filter((m) => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
            });

        const trendingCandidates = trending.results.filter((m) => !seen.has(m.id));

        const [playableReleases, playableTrending] = await Promise.all([
            filterAvailableMovies(releaseCandidates).catch(() => [] as typeof releaseCandidates),
            filterAvailableMovies(trendingCandidates).catch(() => [] as typeof trendingCandidates),
        ]);

        const newReleases = playableReleases.slice(0, 3);
        const trendingMovies = playableTrending.slice(0, 2);

        if (newReleases.length === 0 && trendingMovies.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No playable titles to notify about',
            });
        }

        // ── 2. Get all user IDs ──────────────────────────────────────────────
        // Traemos también `preferences`: los interruptores de /settings deciden
        // qué recibe cada quien. Antes se ignoraban por completo y se insertaba
        // para todo el mundo, así que apagarlos no servía de nada.
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, preferences')
            .eq('is_stb', false); // skip STB device accounts

        if (profilesError) throw profilesError;
        const recipients = (profiles ?? []).map((p: { id: string; preferences?: unknown }) => ({
            id: p.id,
            notifications: normalizePreferences(p.preferences).notifications,
        }));
        const userIds: string[] = recipients.map((r) => r.id);

        if (userIds.length === 0) {
            return NextResponse.json({ success: true, message: 'No users to notify' });
        }

        // ── 3. Find already-notified tmdbIds in the last 7 days ─────────────
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data: recentRaw } = await supabase
            .from('notifications')
            .select('metadata')
            .eq('type', 'newRelease')
            .gte('created_at', since);

        const recentTmdbIds = new Set<number>(
            (recentRaw ?? [])
                .map((r: { metadata?: { tmdbId?: number } }) => r.metadata?.tmdbId)
                .filter((id): id is number => typeof id === 'number')
        );

        // ── 4. Build notification rows ───────────────────────────────────────
        const rows: object[] = [];

        for (const { id: userId, notifications: prefs } of recipients) {
            // New release notifications
            for (const movie of prefs.newReleases ? newReleases : []) {
                if (recentTmdbIds.has(movie.id)) continue;
                const title = 'title' in movie ? (movie as any).title : (movie as any).name;
                const releaseDate = 'release_date' in movie ? (movie as any).release_date : (movie as any).first_air_date;
                const isUpcoming = upcoming.results.some((u) => u.id === movie.id);

                rows.push({
                    user_id: userId,
                    type: 'newRelease',
                    title: isUpcoming ? `Próximamente: ${title}` : `Ahora en cines: ${title}`,
                    message: isUpcoming
                        ? `Se estrena el ${releaseDate ? new Date(releaseDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'pronto'}`
                        : (movie.overview ?? '').slice(0, 80) + ((movie.overview?.length ?? 0) > 80 ? '…' : ''),
                    read: false,
                    metadata: {
                        tmdbId: movie.id,
                        mediaType: 'movie',
                        imageUrl: getImageUrl(movie.poster_path, 'w185') ?? undefined,
                        url: `/movie/${movie.id}`,
                    },
                });
            }

            // Weekly trending summary (one per user)
            if (prefs.recommendations && trendingMovies.length > 0) {
                const titles = trendingMovies
                    .map((m) => ('title' in m ? (m as any).title : (m as any).name))
                    .join(', ');
                rows.push({
                    user_id: userId,
                    type: 'news',
                    title: 'Tendencias de la semana',
                    message: `Lo más visto: ${titles}`,
                    read: false,
                    metadata: {
                        tmdbId: trendingMovies[0].id,
                        mediaType: 'movie',
                        imageUrl: getImageUrl(trendingMovies[0].poster_path, 'w185') ?? undefined,
                        url: `/movie/${trendingMovies[0].id}`,
                    },
                });
            }
        }

        // ── 5. Batch insert ──────────────────────────────────────────────────
        if (rows.length > 0) {
            // Insert in chunks of 500 to stay within Supabase limits
            const CHUNK = 500;
            for (let i = 0; i < rows.length; i += CHUNK) {
                const { error } = await supabase
                    .from('notifications')
                    .insert(rows.slice(i, i + CHUNK));
                if (error) throw error;
            }
        }

        return NextResponse.json({
            success: true,
            users: userIds.length,
            notificationsInserted: rows.length,
        });
    } catch (error: any) {
        console.error('[cron/notifications]', error);
        return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 });
    }
}
