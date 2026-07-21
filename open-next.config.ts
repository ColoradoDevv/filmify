import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

/**
 * OpenNext — Cloudflare Workers adapter configuration.
 *
 * El proyecto usa `export const revalidate` en varias páginas (anime,
 * editorial, home, live-tv, /api/scrape), lo que activa ISR. El adaptador
 * necesita un backend de caché para almacenar y servir las páginas cacheadas.
 *
 * Se usa KV (kvIncrementalCache) porque:
 *  - Latencia de lectura global muy baja (ideal para ISR).
 *  - Sin coste de egress (a diferencia de R2).
 *  - El binding NEXT_INC_CACHE_KV está declarado en wrangler.jsonc.
 *
 * Si en el futuro necesitas caché con payloads >25 MB o prefieres R2,
 * sustituye por r2IncrementalCache de:
 *   "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
 * y añade el binding R2 en wrangler.jsonc.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
