/**
 * Filtros de seguridad para prompts de recomendación de películas (servidor).
 * Objetivo: bloquear contenido +18, explícito sexual y peticiones claramente fuera de cine.
 */

const BLOCKED_MESSAGE =
    'No podemos procesar solicitudes con contenido sexual explícito, violencia sexual, menores en contexto sexual o peticiones no relacionadas con el cine. Reformula tu búsqueda en términos de películas, géneros o emociones (por ejemplo: soledad, aventura, comedia).';

const MIN_LEN = 2;
const MAX_LEN = 480;

/** Fragmentos inequívocos (+18 / ilegal). El texto se normaliza (acentos, espacios, leetspeak simple). */
const BLOCKED_SUBSTRINGS = [
    'porno', 'pornografia', 'pornografía', 'porn0', 'pr0n',
    ' xxx', 'xxx ', 'xxx.', 'xxx/',
    'sexo explicito', 'sexo explícito',
    'follar', 'mamada', 'orgasmo', 'penetracion', 'penetración',
    'prostituta', 'prostituto', 'onlyfans', 'webcam porno', 'hentai', 'lolicon', 'shotacon',
    'incesto', 'violacion sexual', 'violación sexual',
    'child porn', 'deepfake porn',
    'blowjob', 'handjob', 'cumshot', 'gangbang', 'dildo',
    'milf porn', 'rape scene sexual',
    'nsfw porn', 'hardcore porn',
];

function stripDiacritics(s: string): string {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeForScan(input: string): string {
    let s = stripDiacritics(input.toLowerCase());
    s = s.replace(/[_\-./\\|]+/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    // Leetspeak común
    s = s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
    return ` ${s} `;
}

export type MoviePromptSafetyResult =
    | { ok: true }
    | { ok: false; message: string };

export function assertMovieRecommendationPromptSafe(raw: string): MoviePromptSafetyResult {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LEN) {
        return { ok: false, message: 'Escribe al menos un par de palabras para poder recomendarte películas.' };
    }
    if (trimmed.length > MAX_LEN) {
        return { ok: false, message: 'Tu mensaje es demasiado largo. Acórtalo a unas pocas frases.' };
    }

    const haystack = normalizeForScan(trimmed);
    for (const word of BLOCKED_SUBSTRINGS) {
        const needle = normalizeForScan(word);
        if (needle.length >= 2 && haystack.includes(needle)) {
            return { ok: false, message: BLOCKED_MESSAGE };
        }
    }

    return { ok: true };
}
