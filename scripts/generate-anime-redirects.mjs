/**
 * Genera el mapa compacto tmdb_id → anilist_id que usa el middleware para
 * redirigir /tv/[tmdbId] → /anime/[anilistId] con un 308 HTTP real.
 *
 * ¿Por qué un fichero generado y no el mapa en runtime?
 * -----------------------------------------------------
 * `src/server/services/anime/mapping.ts` ya resuelve esto en runtime, pero el
 * redirect a nivel de página llega TARDE: Next ya ha empezado a hacer streaming
 * de la respuesta, así que en vez de un 308 emite un
 * `<meta http-equiv="refresh">`. Funciona para el usuario, pero para SEO es
 * mucho más débil que un 301/308 y el objetivo de mover el anime a su propia
 * ruta era justamente conservar la autoridad de las URLs ya indexadas.
 *
 * El middleware sí puede emitir el 308 (corre antes de renderizar), pero no
 * puede descargar 5,9 MB por petición. De ahí este snapshot compacto (~70 KB)
 * que se importa en el bundle del middleware.
 *
 * Uso:
 *   node scripts/generate-anime-redirects.mjs
 *
 * Conviene re-ejecutarlo de vez en cuando (los animes nuevos aparecen en el
 * dataset con el tiempo). No es crítico: lo que falte en el snapshot lo cubre
 * el redirect de la página, que sí consulta el mapa completo en runtime.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SOURCE_URL =
    'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'lib', 'anime-tmdb-redirects.json');

/** Extrae el tmdb id de serie (solo TV: /tv/[id] es lo que redirigimos). */
function tvId(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const v = raw.tv;
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    if (Array.isArray(v)) {
        const n = v.find((x) => typeof x === 'number' && x > 0);
        return n ?? null;
    }
    return null;
}

function season(entry) {
    const v = entry?.season?.tmdb;
    if (typeof v === 'number' && v > 0) return v;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return 1;
}

console.log('Descargando el dataset de mapeo…');
const res = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
if (!res.ok) {
    console.error(`Fallo al descargar: HTTP ${res.status}`);
    process.exit(1);
}
const entries = await res.json();
console.log(`  ${entries.length} entradas`);

// Un tmdb_id de serie agrupa varias temporadas de AniList: nos quedamos con la
// más baja, que es la entrada canónica a la que redirigir.
const best = new Map();
for (const e of entries) {
    const anilistId = e.anilist_id;
    const tmdb = tvId(e.themoviedb_id);
    if (typeof anilistId !== 'number' || !tmdb) continue;
    const s = season(e);
    const prev = best.get(tmdb);
    if (!prev || s < prev.season) best.set(tmdb, { anilistId, season: s });
}

const map = {};
for (const [tmdb, { anilistId }] of [...best.entries()].sort((a, b) => a[0] - b[0])) {
    map[tmdb] = anilistId;
}

const json = JSON.stringify(map);
await writeFile(OUT_PATH, json + '\n', 'utf8');

console.log(`✓ ${Object.keys(map).length} redirecciones escritas en`);
console.log(`  src/lib/anime-tmdb-redirects.json (${(json.length / 1024).toFixed(1)} KB)`);
