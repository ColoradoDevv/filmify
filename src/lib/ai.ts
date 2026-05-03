'use server';

import Groq from 'groq-sdk';
import { getSettings } from '@/lib/admin-settings';
import { getOptionalApiKeys } from '@/lib/env';
import { assertMovieRecommendationPromptSafe } from '@/lib/ai-prompt-safety';

const { groqApiKey: apiKey } = getOptionalApiKeys();

// Initialize Groq
const groq = apiKey ? new Groq({ apiKey }) : null;

export interface Recommendation {
    title: string;
    reason: string;
}

interface AIRecommendationResponse {
    title: string;
    reason: string;
}

export async function getGeminiRecommendations(favorites: string[]): Promise<Recommendation[]> {
    const settings = await getSettings();
    if (!settings.enableAi) return [];

    if (!groq) {
        return [];
    }

    if (favorites.length === 0) {
        return [];
    }

    const prompt = `Act as a movie recommendation expert.
Based on these favorite movies: ${favorites.join(', ')}.
Recommend 3 similar movies that the user might like.
IMPORTANT: Respond in Spanish.
Return ONLY a JSON array with this format:
[
    { "title": "Movie Title", "reason": "Short reason why" }
]
Do not include markdown formatting or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 1000,
        });

        const text = completion.choices[0]?.message?.content || '';

        // Clean up markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendations: AIRecommendationResponse[] = JSON.parse(jsonStr);

        return recommendations;
    } catch (error) {
        return [];
    }
}

export type MovieRecommendationPick = {
    /** Cadena óptima para /search/movie en TMDB (idealmente título en inglés). */
    tmdbQuery: string;
    /** Año de estreno para desambiguar resultados de búsqueda. */
    year?: number;
};

export type MovieRecommendationsJSONResult =
    | { ok: true; items: MovieRecommendationPick[] }
    | { ok: false; error: string };

function extractJsonArrayFromModelText(raw: string): unknown[] | null {
    const noFence = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    try {
        const p = JSON.parse(noFence);
        if (Array.isArray(p)) return p;
    } catch {
        /* continuar */
    }
    const m = noFence.match(/\[[\s\S]*\]/);
    if (m) {
        try {
            const p = JSON.parse(m[0]);
            if (Array.isArray(p)) return p;
        } catch {
            return null;
        }
    }
    return null;
}

/** Acepta objeto { movies: [...] } (JSON mode), array suelto o primer array en el texto. */
function parseMovieRowsFromGroqContent(raw: string): unknown[] | null {
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    if (!cleaned) return null;
    try {
        const p = JSON.parse(cleaned);
        if (Array.isArray(p)) return p;
        if (p && typeof p === 'object') {
            const o = p as Record<string, unknown>;
            const keys = ['movies', 'peliculas', 'películas', 'recommendations', 'items', 'results', 'films'];
            for (const k of keys) {
                const v = o[k];
                if (Array.isArray(v) && v.length > 0) return v;
            }
        }
    } catch {
        /* intentar extracción laxa */
    }
    return extractJsonArrayFromModelText(raw);
}

function normalizeRecommendationRows(raw: unknown[]): MovieRecommendationPick[] {
    const out: MovieRecommendationPick[] = [];
    for (const row of raw) {
        if (typeof row === 'string') {
            const t = row.trim();
            if (t) out.push({ tmdbQuery: t });
            continue;
        }
        if (row && typeof row === 'object') {
            const o = row as Record<string, unknown>;
            const candidates = [
                o.search, o.tmdb_search, o.tmdbQuery, o.q, o.title, o.title_en,
                o.movie, o.movie_title, o.film, o.pelicula, o.película, o.nombre, o.name, o.english_title,
            ];
            const search = candidates.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim();
            if (!search) continue;
            let year: number | undefined;
            const y = o.year ?? o.y ?? o.release_year;
            if (typeof y === 'number' && y > 1888 && y < 2100) year = y;
            else if (typeof y === 'string' && /^\d{4}$/.test(y)) year = parseInt(y, 10);
            out.push({ tmdbQuery: search, year });
        }
    }
    return out;
}

const MOVIE_JSON_SYSTEM = `Eres un crítico de cine. El usuario pide qué ver describiendo estado de ánimo, tema o género (español o inglés: una palabra o frases como "felicidad", "happy", "quiero sentirme triste", "quiero sentirme solo", "comedia ligera", etc.).

Interpreta la intención y elige 5 o 6 películas REALES que encajen emocional o temáticamente.

Reglas:
- Solo cine de interés general o de autor; nada pornográfico ni apología de violencia sexual.
- Cada "search" debe ser un título reconocible en TMDB, preferiblemente en INGLÉS (mejor para la API).
- "year" es el año de estreno (número) cuando lo sepas; si no, usa null.

Debes responder con un ÚNICO objeto JSON (no markdown) con esta forma exacta:
{"movies":[{"search":"Inside Out","year":2015},{"search":"Little Miss Sunshine","year":2006}]}

La clave raíz debe llamarse "movies".`;

/**
 * Recomendaciones según prompt del usuario (estado de ánimo, género, tema).
 * Respuesta estructurada para TMDB + filtros de seguridad en el texto de entrada.
 */
export async function getMovieRecommendationsJSON(prompt: string): Promise<MovieRecommendationsJSONResult> {
    const safety = assertMovieRecommendationPromptSafe(prompt);
    if (!safety.ok) {
        return { ok: false, error: safety.message };
    }

    const settings = await getSettings();
    if (!settings.enableAi) {
        return { ok: false, error: 'La recomendación por IA está desactivada en este sitio.' };
    }

    if (!groq) {
        return { ok: false, error: 'La IA no está configurada (falta clave de Groq en el servidor).' };
    }

    const userLine = `Petición del usuario: ${prompt.trim()}`;

    const runGroq = async (useJsonObject: boolean) => {
        return groq!.chat.completions.create({
            messages: [
                { role: 'system', content: MOVIE_JSON_SYSTEM },
                { role: 'user', content: userLine },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.45,
            max_tokens: 1200,
            ...(useJsonObject ? { response_format: { type: 'json_object' as const } } : {}),
        });
    };

    try {
        let text = '';
        try {
            const completion = await runGroq(true);
            text = completion.choices[0]?.message?.content || '';
        } catch (jsonModeErr) {
            console.warn('[getMovieRecommendationsJSON] JSON mode falló, reintento sin response_format:', jsonModeErr);
            const completion = await runGroq(false);
            text = completion.choices[0]?.message?.content || '';
        }

        const arr = parseMovieRowsFromGroqContent(text);
        if (!arr?.length) {
            return {
                ok: false,
                error:
                    'La IA no devolvió una lista usable de películas (respuesta vacía o formato inesperado). Actualiza la página, vuelve a intentar o prueba una frase un poco más larga (ej. "películas alegres para levantar el ánimo").',
            };
        }

        const items = normalizeRecommendationRows(arr).filter((x) => x.tmdbQuery.length > 0);
        if (items.length === 0) {
            return {
                ok: false,
                error:
                    'No pude leer los títulos sugeridos (faltaba el campo de búsqueda en cada ítem). Prueba de nuevo; si persiste, revisa la clave GROQ_API_KEY y el modelo en el panel de Groq.',
            };
        }

        return { ok: true, items };
    } catch (error) {
        console.error('[getMovieRecommendationsJSON]', error);
        return { ok: false, error: 'Error al contactar el modelo de IA. Inténtalo de nuevo en unos segundos.' };
    }
}

/**
 * Generate a generic AI response based on a prompt
 */
export async function generateAIResponse(prompt: string): Promise<string> {
    const settings = await getSettings();
    if (!settings.enableAi) return 'La IA está deshabilitada por el administrador.';

    if (!groq) {
        return 'Lo siento, la IA no está configurada correctamente.';
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 500,
        });

        return completion.choices[0]?.message?.content || '';
    } catch (error) {
        return 'Lo siento, hubo un error al procesar tu solicitud.';
    }
}

/**
 * Get AI-generated search correction
 */
export async function getSearchCorrection(query: string): Promise<string | null> {
    const settings = await getSettings();
    if (!settings.enableAi) return null;

    if (!groq) {
        return null;
    }

    const prompt = `Act as a movie search assistant.
    The user searched for: "${query}".
    Did they likely mean a specific movie or TV show title that is spelled differently?
    If yes, return ONLY the corrected title.
    If the spelling seems correct or you are unsure, return "null".
    Example: User "moaaana" -> Return "Moana"
    Example: User "matrix" -> Return "null" (correct spelling)
    IMPORTANT: Return ONLY the string of the title or the string "null". Do not include quotes or explanations.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 50,
        });

        const text = completion.choices[0]?.message?.content?.trim() || 'null';
        if (text.toLowerCase() === 'null' || text.toLowerCase() === query.toLowerCase()) {
            return null;
        }

        // Remove quotes if present
        return text.replace(/^["']|["']$/g, '');
    } catch (error) {
        return null;
    }
}
/**
 * Get YouTube trailer ID using AI
 */
export async function getYouTubeTrailerId(title: string, year: string, type: 'movie' | 'tv', productionCompany?: string): Promise<string | null> {
    const settings = await getSettings();
    if (!settings.enableAi) return null;

    if (!groq) {
        return null;
    }

    const companyContext = productionCompany ? ` produced by "${productionCompany}"` : '';
    const channelContext = productionCompany ? ` Look specifically on the official "${productionCompany}" YouTube channel or their local subsidiary channels.` : '';

    const prompt = `Act as a movie database expert.
    Find the YouTube video ID for the official trailer of the ${type}: "${title}" (${year})${companyContext}.
    ${channelContext}
    Return ONLY the 11-character YouTube video ID string.
    Example: "d9My665987"
    If you are not 100% sure or cannot find a specific trailer, return "null".
    IMPORTANT: Return ONLY the ID string or "null". Do not include quotes, explanations, or full URLs.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 20,
        });

        const text = completion.choices[0]?.message?.content?.trim() || 'null';

        // Clean up the response
        let videoId = text.replace(/^["']|["']$/g, '');

        // Handle explicit null from AI
        if (videoId.toLowerCase() === 'null') {
            return null;
        }

        // Handle if AI returns a full URL
        if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
            const urlMatch = videoId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
            if (urlMatch) {
                videoId = urlMatch[1];
            }
        }

        // Validate ID format (11 characters, alphanumeric, -, _)
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return null;
        }

        return videoId;
    } catch (error) {
        return null;
    }
}
