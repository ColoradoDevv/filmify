/**
 * custom-worker.ts — FilmiFy Cloudflare Worker entry point.
 *
 * El adaptador @opennextjs/cloudflare genera `.open-next/worker.js` con solo
 * un handler `fetch`. Este archivo lo envuelve para añadir el handler
 * `scheduled()` que ejecuta los tres cron jobs migrados desde vercel.json.
 *
 * Referencia oficial: https://opennext.js.org/cloudflare/howtos/custom-worker
 *
 * TypeScript: este archivo se valida con `tsc -p tsconfig.worker.json`.
 * Está excluido del tsconfig.json principal del proyecto Next.js para evitar
 * conflictos entre tipos de Workers y tipos de DOM/browser.
 */

/// <reference types="@cloudflare/workers-types" />

// @ts-ignore — .open-next/worker.js se genera en tiempo de build, no existe en el repo.
import { default as handler } from "./.open-next/worker.js";

// Env mínimo que necesita el worker. CloudflareEnv (de @opennextjs/cloudflare)
// augmenta el global Env con los bindings del adaptador (ASSETS, NEXT_INC_CACHE_KV…).
// Aquí solo declaramos los bindings que el scheduled handler necesita explícitamente.
interface WorkerEnv {
  CRON_SECRET?: string;
  ASSETS?: Fetcher;
  NEXT_INC_CACHE_KV?: KVNamespace;
  [key: string]: unknown;
}

/**
 * Mapa cron-schedule → ruta de API.
 * Debe coincidir exactamente con los crons declarados en wrangler.jsonc
 * y con los manejadores en src/app/api/cron/*.
 */
const CRON_MAP: Record<string, string> = {
  "0 0 * * *": "/api/cron/cleanup",
  "0 9 * * *": "/api/cron/notifications",
  "0 6 * * *": "/api/cron/rss",
};

export default {
  /** Todas las peticiones HTTP normales las maneja el worker de OpenNext. */
  fetch: handler.fetch,

  /**
   * Handler de Cron Triggers (wrangler.jsonc → triggers.crons).
   *
   * Estrategia: llamamos directamente al handler.fetch del mismo worker con
   * una Request sintética. Esto evita un fetch externo (que requeriría URL
   * pública y añade latencia de red), y garantiza que los crons funcionen
   * aunque el dominio custom no esté aún apuntado o en entornos de preview.
   *
   * IMPORTANTE: CRON_SECRET debe estar configurado como "Secret" en el
   * dashboard de Cloudflare (Workers & Pages → filmify → Settings →
   * Variables and Secrets). Sin él, las rutas /api/cron/* devuelven 401.
   *
   * Para probar en local:
   *   npx wrangler dev --test-scheduled
   *   curl "http://localhost:8787/__scheduled?cron=0+0+*+*+*"
   *   # verifica los logs en la terminal donde corre wrangler dev
   *
   * Para monitorizar en producción:
   *   npx wrangler tail filmify
   */
  async scheduled(event, env, ctx) {
    const route = CRON_MAP[event.cron];

    if (!route) {
      console.error(`[cron] Schedule no mapeado: "${event.cron}"`);
      return;
    }

    const cronSecret = env["CRON_SECRET"];
    if (!cronSecret) {
      console.error(`[cron] CRON_SECRET no configurado — saltando ${route}`);
      return;
    }

    console.log(`[cron] Iniciando ${route} (schedule: "${event.cron}")`);

    try {
      // Llamada interna directa al fetch handler del worker generado por OpenNext.
      // Usamos una URL ficticia con host "localhost" — el worker la recibe igual
      // que cualquier otra request y la enruta a la API route de Next.js.
      // No sale a internet: es una llamada directa en memoria al mismo handler.
      const internalRequest = new Request(`http://localhost${route}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          // Marcar la llamada para distinguirla en los logs de las rutas de API.
          "X-Cron-Trigger": "cloudflare-worker",
          "X-Forwarded-For": "127.0.0.1",
        },
      });

      const response = await handler.fetch(internalRequest, env, ctx);
      const text = await response.text();

      if (!response.ok) {
        console.error(
          `[cron] ${route} respondió ${response.status}: ${text.slice(0, 300)}`,
        );
      } else {
        console.log(
          `[cron] ${route} OK (${response.status}): ${text.slice(0, 300)}`,
        );
      }
    } catch (err) {
      console.error(`[cron] Error al invocar ${route}:`, err);
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
