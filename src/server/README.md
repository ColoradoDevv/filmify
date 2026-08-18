# `src/server` — Backend layer

This directory is the **single entry point for all server-side logic** in
FilmiFy. The goal is a clean separation between the Next.js frontend
(`src/app/*.tsx`, `src/components`, `src/hooks`) and the backend
(`src/server/*`), while still shipping as one deployable unit.

## Why not a separate backend app?

FilmiFy uses Next.js App Router with Server Components, Server Actions, and
middleware (`src/proxy.ts`). Splitting into two physical apps would require
reinventing auth, cookies, and the data-fetching boundary with no real
benefit. Instead we enforce the split **logically**: frontend code may only
touch backend code through `@/server/*`.

## Layout (MVC-flavoured)

```
src/server/
├── services/        # Business logic (TMDB, AI, embed extraction, live TV, …)
├── repositories/    # Data access (Supabase server client, admin client)
├── controllers/     # Orchestration called from route handlers / server actions
├── models/          # Domain types and DTOs
└── index.ts         # Public re-exports — the frontend imports from here
```

### services/
Pure business logic. A service never knows about HTTP, cookies, or the Next.js
request/response lifecycle. It takes plain inputs and returns plain outputs.

Current services:
- `tmdb` — The Movie DB content API (trending, details, search, images).
- `ai` — LLM-backed recommendations (Groq).
- `embed-extractor` — Scrapes third-party embed providers.
- `live-tv` — Live TV channel registry and stream resolution.
- `admin-settings` — Feature flags & announcements read/write.

### repositories/
Data access. Wraps Supabase clients so the rest of the code never calls
`createClient()` directly. Swappable if the persistence layer ever changes.

- `supabase` — Server-side Supabase clients (standard, admin, service-role).

### controllers/
(To be populated.) Thin orchestration called from:
- API route handlers in `src/app/api/**`
- Server Actions in `src/app/**/actions.ts`

A controller composes services + repositories and returns a plain result. It
does not format HTTP responses — route handlers do that.

### models/
(To be populated.) Domain types shared by the backend. For now, shared TMDB
types live in `src/types/tmdb.ts`.

## Import rules

```ts
// ✅ Frontend code
import { getTrending, getMovieDetails } from '@/server/services/tmdb';
import { createSupabaseServerClient } from '@/server/repositories/supabase';

// ❌ Avoid in new code (legacy path still works during migration)
import { getTrending } from '@/lib/tmdb/service';
```

## Migration status

Consumer code has been switched to `@/server/*` for `@/lib/tmdb/service` and
the server-side Supabase clients (`@/lib/supabase/server`, `@/lib/supabase/admin`).
`src/server/**` still re-exports the legacy implementations underneath — the
actual logic hasn't moved, only the import boundary — so behavior is
unchanged. Keep new code on `@/server/*`.

Not part of this migration, and expected to stay on `@/lib/*` directly:
- `@/lib/supabase/client` — the browser Supabase client. It runs in the
  client bundle, so it belongs on the frontend side of the boundary, not
  behind `@/server`.
- Legacy `src/lib/*` and `src/services/*` modules that haven't been promoted
  to `src/server/services/*` yet (e.g. `watch-party*`, `notifications`,
  `editorial`) — they now *import* Supabase/TMDB access through `@/server/*`
  internally, but the modules themselves still live in `src/lib`/`src/services`.
