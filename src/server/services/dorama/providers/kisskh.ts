/**
 * Proveedor KissKH — relleno de catálogo, DESACTIVADO por defecto.
 *
 * Qué aporta y qué no
 * -------------------
 * KissKH tiene el catálogo más grande con diferencia: su API pública y sin
 * clave declara **12.732 títulos**. De los 11 doramas que ni Vimeus ni
 * APIPlayer cubren en nuestra muestra, KissKH tiene 7 (Business Proposal,
 * Alchemy of Souls, Descendants of the Sun, KinnPorsche, 2gether, Reply 1988
 * y Misaeng).
 *
 * Pero **no sirve subtítulos en español**. Verificado pidiendo las pistas
 * reales de siete títulos: el listado es siempre el mismo — árabe, neerlandés,
 * inglés, indonesio, jemer, malayo y a veces tailandés. Su audiencia es el
 * sudeste asiático. Para un sitio es-ES eso significa que su catálogo solo
 * vale como último recurso, y etiquetado sin engañar al usuario.
 *
 * Por eso va detrás de todo y apagado tras `DORAMA_ENABLE_KISSKH=1`: activarlo
 * es una decisión de producto (más catálogo a cambio de que parte esté en
 * inglés), no técnica.
 *
 * Cómo se resuelve un episodio
 * ----------------------------
 * KissKH no conoce tmdb_id: hay que buscar por título y quedarse con su id
 * interno, y luego con el id del episodio concreto.
 *
 *   GET kisskh.co/api/DramaList/Search?q=<título>  → [{ id, title, episodesCount }]
 *   GET kisskh.co/api/DramaList/Drama/{id}         → { country, type, episodes:[{id, number}] }
 *   embed: kisskh.megaplay.su/kisskh/{episodeId}
 *
 * El embed discrimina disponibilidad en servidor: si el episodio no existe
 * devuelve una página de error con "Error Code: 404" en lugar del reproductor.
 *
 * ⚠️ La búsqueda por título reintroduce el emparejamiento difuso que este
 * proyecto evita en el resto de módulos. El umbral es alto a propósito: con
 * fuentes que no comparten ids, un match flojo reproduce OTRA serie.
 */

import type { DoramaPlaybackContext, DoramaProvider, DoramaSource } from '../types';

const API_BASE = 'https://kisskh.co/api/DramaList';
const EMBED_BASE = 'https://kisskh.megaplay.su/kisskh';
const FETCH_TIMEOUT_MS = 12_000;
const REVALIDATE_S = 21_600; // 6 h — su catálogo se mueve poco
const DEBUG = process.env.NODE_ENV === 'development';

interface SearchHit {
    id?: number;
    title?: string;
    episodesCount?: number;
}

interface DramaDetail {
    country?: string;
    type?: string;
    status?: string;
    episodes?: Array<{ id?: number; number?: number; sub?: number }>;
}

async function api<T>(path: string): Promise<T | null> {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; FilmiFy/2.0)',
            },
            next: { revalidate: REVALIDATE_S },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch (err) {
        if (DEBUG) console.warn(`[kisskh] fallo en ${path}:`, err);
        return null;
    }
}

/** Normaliza títulos para comparar. */
function norm(t: string): string {
    return t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Empareja por título con umbral alto (ver advertencia de la cabecera). */
function pickBest(hits: SearchHit[], ctx: DoramaPlaybackContext): SearchHit | null {
    const wanted = [ctx.titles?.name, ctx.titles?.originalName]
        .filter(Boolean)
        .map((t) => norm(t as string));
    if (wanted.length === 0) return null;

    let best: { hit: SearchHit; score: number } | null = null;
    for (const hit of hits) {
        if (!hit.title || !hit.id) continue;
        const name = norm(hit.title);
        let score = 0;
        if (wanted.includes(name)) score += 100;
        else if (wanted.some((w) => name.startsWith(w) || w.startsWith(name))) score += 55;
        else continue; // ni exacto ni prefijo: descartado
        if (!best || score > best.score) best = { hit, score };
    }
    return best && best.score >= 55 ? best.hit : null;
}

/** Resuelve el id de episodio de KissKH para el contexto dado. */
export async function resolveKisskhEpisodeId(
    ctx: DoramaPlaybackContext,
): Promise<number | null> {
    const query = ctx.titles?.originalName || ctx.titles?.name;
    if (!query) return null;

    const hits = await api<SearchHit[]>(`/Search?q=${encodeURIComponent(query)}`);
    if (!Array.isArray(hits) || hits.length === 0) return null;

    const match = pickBest(hits, ctx);
    if (!match?.id) return null;

    const detail = await api<DramaDetail>(`/Drama/${match.id}`);
    const episodes = detail?.episodes ?? [];
    const ep = episodes.find((e) => Number(e.number) === ctx.episode);
    return typeof ep?.id === 'number' ? ep.id : null;
}

export const kisskhProvider: DoramaProvider = {
    id: 'kisskh',
    label: 'KissKH',

    isEnabled: () => process.env.DORAMA_ENABLE_KISSKH === '1',

    // Determinarlo exige recorrer búsqueda + detalle; getSources ya devuelve []
    // si no resuelve, así que no gastamos una ronda extra.
    isAvailable: async () => null,

    async getSources(ctx: DoramaPlaybackContext): Promise<DoramaSource[]> {
        const episodeId = await resolveKisskhEpisodeId(ctx).catch(() => null);
        if (!episodeId) return [];

        return [
            {
                provider: 'kisskh',
                kind: 'iframe',
                label: 'KissKH · Sub inglés',
                url: `${EMBED_BASE}/${episodeId}`,
                audio: 'sub',
                // Verificado en 7 títulos: nunca incluye español.
                subtitleLanguages: ['English', 'Arabic', 'Indonesian', 'Malay'],
                spanishSubs: false,
                priority: 20, // último recurso
                verified: false,
            },
        ];
    },
};
