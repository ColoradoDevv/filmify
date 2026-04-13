/**
 * Public entry point for the backend layer.
 *
 * Frontend code (Server Components, Server Actions, API routes) should import
 * from `@/server` or the specific submodule, e.g. `@/server/services/tmdb`.
 *
 * See `./README.md` for the architecture overview.
 */

// Services (business logic)
export * as tmdbService from './services/tmdb';
export * as aiService from './services/ai';
export * as embedExtractorService from './services/embed-extractor';
export * as liveTvService from './services/live-tv';
export * as adminSettingsService from './services/admin-settings';
export * as adminLoggerService from './services/admin-logger';

// Repositories (data access)
export * as supabaseRepo from './repositories/supabase';
export * as historyRepo from './repositories/history';
