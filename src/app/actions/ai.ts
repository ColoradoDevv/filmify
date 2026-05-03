'use server';

/**
 * Server Actions para FilmiFy AI.
 * Separado de src/lib/ai.ts para evitar que la inicialización top-level
 * de Groq interfiera con el bundling de Server Actions en Next.js 15.
 */

import { getSettings } from '@/lib/admin-settings';
import { getOptionalApiKeys } from '@/lib/env';
import { assertMovieRecommendationPromptSafe } from '@/lib/ai-prompt-safety';

export type MovieRecommendationPick = {
    tmdbQuery: string;
    year?: number;
};

export type MovieRecommendationsJSONResult =
    | { ok: true; items: MovieRecommendationPick[] }
    | { ok: false; error: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractJsonArray(raw: string): unknown[] | null {
    const clean = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    try {
        const p = JSON.parse(clean);
        if (Array.isArray(p)) return p;
        // JSON mode wraps in { movies: [...] }
        if (p && typeof p === 'object') {
            for (const key of Object.keys(p)) {
                if (Array.isArray((p as Record<string, unknown>)[key])) {
                    return (p as Record<string, unknown>)[key] as unknown[];
                }
            }
        }
    } catch { /* continue */ }
    const m = clean.match(/\[[\s\S]*\]/);
    if (m) {
        try {
            const p = JSON.parse(m[0]);
            if (Array.isArray(p)) return p;
        } catch { return null; }
    }
    return null;
}

function normalizeRows(rows: unknown[]): MovieRecommendationPick[] {
    return rows
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map((r) => {
            const query =
                (r['tmdbQuery'] as string) ||
                (r['title_en'] as string) ||
                (r['title'] as string) ||
                '';
            const year = r['year'] ? Number(r['year']) : undefined;
            return { tmdbQuery: query.trim(), year };
        })
        .filter((r) => r.tmdbQuery.length > 0);
}

const SYSTEM_PROMPT = `Eres un experto en cine. El usuario describe un estado de ánimo, género o trama.
Devuelve SOLO un JSON con esta estructura exacta (sin markdown, sin explicaciones):
{"movies":[{"tmdbQuery":"<título en inglés para buscar en TMDB>","year":<año opcional>}]}
Incluye entre 5 y 8 películas. Usa el título original en inglés para tmdbQuery.`;

// ── Main action ───────────────────────────────────────────────────────────────

export async function getAIRecommendations(prompt: string): Promise<MovieRecommendationsJSONResult> {
    // 1. Safety check (client-side also runs this, but double-check server-side)
    const safety = assertMovieRecommendationPromptSafe(prompt);
    if (!safety.ok) return { ok: false, error: safety.message };

    // 2. Feature flag
    const settings = await getSettings();
    if (!settings.enableAi) {
        return { ok: false, error: 'Las recomendaciones por IA están desactivadas.' };
    }

    // 3. API key — initialize inside the function to avoid top-level module issues
    const { groqApiKey } = getOptionalApiKeys();
    if (!groqApiKey) {
        return {
            ok: false,
            error: 'FilmiFy AI no está configurado en este entorno. Contacta al administrador.',
        };
    }

    try {
        // Dynamic import to avoid bundling Groq in the client
        const Groq = (await import('groq-sdk')).default;
        const groq = new Groq({ apiKey: groqApiKey });

        let text = '';

        // Helper: sleep ms
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        // Retry with exponential backoff for rate limits (429)
        const callGroq = async (useJsonMode: boolean): Promise<string> => {
            const MAX_ATTEMPTS = 3;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    const res = await groq!.chat.completions.create({
                        model: 'llama-3.3-70b-versatile',
                        temperature: 0.4,
                        max_tokens: 1000,
                        ...(useJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user',   content: `Petición: ${prompt.trim()}` },
                        ],
                    });
                    return res.choices[0]?.message?.content ?? '';
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    const isRateLimit = msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit');
                    if (isRateLimit && attempt < MAX_ATTEMPTS) {
                        // Exponential backoff: 2s, 4s
                        await sleep(2000 * attempt);
                        continue;
                    }
                    throw err;
                }
            }
            throw new Error('Max retry attempts reached');
        };

        // Try JSON mode first, fall back to plain text if unsupported
        try {
            text = await callGroq(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            // Only fall back to plain text if it's not a rate limit error
            if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit')) {
                throw err; // Let the outer catch handle it with the right message
            }
            text = await callGroq(false);
        }

        const rows = extractJsonArray(text);
        if (!rows?.length) {
            return {
                ok: false,
                error: 'La IA no devolvió resultados válidos. Intenta con una descripción más específica.',
            };
        }

        const items = normalizeRows(rows);
        if (items.length === 0) {
            return {
                ok: false,
                error: 'No se pudieron procesar las sugerencias. Prueba con otra descripción.',
            };
        }

        return { ok: true, items };

    } catch (err: unknown) {
        console.error('[getAIRecommendations]', err);
        const msg = err instanceof Error ? err.message : String(err);
        // Groq rate limit
        if (msg.includes('429') || msg.includes('rate')) {
            return { ok: false, error: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.' };
        }
        return { ok: false, error: 'Error al contactar la IA. Inténtalo de nuevo en unos segundos.' };
    }
}
