/**
 * TMDB content service — canonical import path for the backend layer.
 *
 * This re-exports the current implementation in `src/lib/tmdb/service.ts` so
 * new code can depend on `@/server/services/tmdb` while legacy imports keep
 * working during migration.
 */
export * from '@/lib/tmdb/service';
export { TMDBService as default } from '@/lib/tmdb/service';
