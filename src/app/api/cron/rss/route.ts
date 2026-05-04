/**
 * Cron: fetch RSS feeds from cinema news sources and cache in Supabase.
 *
 * Schedule: every 6 hours (see vercel.json)
 * Auth: Bearer CRON_SECRET header
 *
 * Sources: Screen Rant, CinemaBlend, MovieWeb, FirstShowing
 * Items are deduplicated by guid. Old items (>30 days) are pruned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getOptionalApiKeys } from '@/lib/env';
import { parseFeed, RSS_SOURCES } from '@/lib/rss';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    const { cronSecret } = getOptionalApiKeys();
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServiceRoleClient();
    let totalInserted = 0;
    let totalSkipped  = 0;

    try {
        // ── 1. Fetch all feeds in parallel ───────────────────────────────────
        const results = await Promise.allSettled(
            RSS_SOURCES.map(source => parseFeed(source))
        );

        const allItems = results.flatMap((r, i) => {
            if (r.status === 'fulfilled') return r.value;
            console.error(`[cron/rss] Feed ${RSS_SOURCES[i].name} failed:`, (r as PromiseRejectedResult).reason);
            return [];
        });

        if (allItems.length === 0) {
            return NextResponse.json({ success: true, message: 'No items fetched' });
        }

        // ── 2. Upsert — skip existing guids ──────────────────────────────────
        const CHUNK = 100;
        for (let i = 0; i < allItems.length; i += CHUNK) {
            const chunk = allItems.slice(i, i + CHUNK);
            const { error, count } = await supabase
                .from('news_feed')
                .upsert(chunk, { onConflict: 'guid', ignoreDuplicates: true })
                .select('id');

            if (error) {
                console.error('[cron/rss] Upsert error:', error);
            } else {
                totalInserted += count ?? 0;
                totalSkipped  += chunk.length - (count ?? 0);
            }
        }

        // ── 3. Prune items older than 30 days ─────────────────────────────────
        const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
        await supabase
            .from('news_feed')
            .delete()
            .lt('published_at', cutoff);

        return NextResponse.json({
            success: true,
            fetched: allItems.length,
            inserted: totalInserted,
            skipped: totalSkipped,
        });
    } catch (err: any) {
        console.error('[cron/rss]', err);
        return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
    }
}
