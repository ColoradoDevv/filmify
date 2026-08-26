# CLAUDE.md

Guidance for AI assistants (Claude Code) working in this repository.

## Project overview

**FilmiFy** is a Spanish-language (es-ES) streaming discovery platform — a
"where to watch" catalog for movies and TV shows, built with **Next.js 15
(App Router, Turbopack, React 19)**. It is a public site: catalog browsing,
search, and playback work for anonymous visitors; an account (Supabase Auth)
unlocks favorites, lists, reviews, watch parties, and notifications. There is
also an admin dashboard for content/user/editorial moderation.

Additional bolted-on features: an editorial/blog section (SEO articles) and
a synchronized "Watch Party" feature.

**Live TV is temporarily disabled** (2026-08-17): the channel source it
depended on became unreliable, so `/live-tv` and `/api/channels` now render
a "coming soon" placeholder / return 503 for everyone, regardless of auth.
The implementation is untouched on disk — `src/app/(platform)/live-tv/`,
`src/components/live-tv/`, `src/services/liveTV.ts`,
`src/server/services/live-tv.ts` — only the entry points (page, API route,
and every nav link to `/live-tv`) were disabled/removed. To re-enable:
restore `LiveTVClient` in `live-tv/page.tsx`, restore the `fetchAllChannels`
call in `api/channels/route.ts`, and re-add the nav links (Navbar,
MobileMenu, Footer, TVSidebar, TVNavBar, FilterBar) once the channel source
is fixed.

**Doramas is closed in every environment** (2026-08-18, tightened
2026-08-21): the module lives at `src/app/(platform)/doramas/` (catalog) and
`src/server/services/dorama/` (playback for *all* TV series, not just
doramas — `/tv/[id]` resolves its sources through this registry, so **never
disable the service layer**). Only the public route and its nav links are
closed: `next.config.ts` redirects `/doramas` → `/browse?category=tv`,
`isDoramasEnabled()` in `src/lib/env.ts` hides the Sidebar/MobileTabBar and
`ModuleQuickAccess` entries, and `doramaCatalogAction` returns an empty page
so the Server Action isn't an open back door to the catalog.

`isDoramasEnabled()` is now strictly opt-in — `NEXT_PUBLIC_DORAMAS_ENABLED`
must be `1`/`true`, with no per-environment default. It used to default to
"open" outside production, which meant the module showed up locally but not
in prod and made the branch look out of date while working on the home page.
The condition in `next.config.ts` must stay byte-for-byte equivalent: when
the two drifted, `/doramas` stopped redirecting and answered 200 with the
"not found" screen — the exact soft-404 the page's `notFound()` avoids.
To work on it, set `NEXT_PUBLIC_DORAMAS_ENABLED=1` in `.env.local`.

Why: APIPlayer (`apiplayer.ru`), which covered about half the catalog,
started answering every manifest request with `403 turnstile_required` —
verified from the EC2 host too, so it is not an IP-specific block. Without
it only Vimeus-listed doramas survive the availability filter (11-17 per
region). The provider probe now reads a challenge as "cannot tell" instead
of "does not have it", and a circuit breaker stops calling for 5 minutes
after a block, so coverage returns on its own if they stop challenging us.
To reopen: set `NEXT_PUBLIC_DORAMAS_ENABLED=1` on the EC2 host and redeploy
(the flag is read at build time).

Note the dorama availability filter degrades **closed**, unlike anime's:
`/tv/[id]` calls `notFound()` when no provider has a title, so an optimistic
catalog fills the grid with links to 404s.

## Tech stack

- **Framework**: Next.js 16.3 (App Router), Turbopack, React 19, TypeScript (strict)
- **Styling**: Tailwind CSS v4, shadcn/ui ("new-york" style, Radix primitives), `lucide-react` icons
- **State**: Zustand (`src/lib/store/useStore.ts`), persisted to localStorage
- **Auth/DB**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres + RLS
- **Content data**: TMDB (The Movie Database) API
- **AI**: Groq SDK (v1.x — zero dependencies, native `fetch`; v0.x pulled in
  `node-fetch@2` and made Node emit `DEP0169` on every movie page)
- **Other integrations**: Resend (email), hCaptcha, Vercel Analytics/Speed Insights, Google Analytics
- **Player**: hls.js + third-party embed providers (Vimeus, SuperEmbed, "Latino" proxy)

## Repository structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Route group: login, register, password reset, confirm-email
│   ├── (platform)/           # Route group: browse, search, favorites, lists, profile,
│   │                          #   settings, watch-party, anime, doramas
│   │                          #   (live-tv and doramas exist but are closed — see notes above)
│   ├── admin/                 # Admin dashboard (RBAC-gated: admin/super_admin role)
│   ├── api/                   # Route handlers (proxies, cron jobs, watch-party, stream health…)
│   ├── actions/               # Top-level Server Actions (catalog, search, streams, ai,
│   │                          #   vidsrc, anime, doramas, series)
│   ├── editorial/             # SEO blog/news articles
│   ├── legal/, about/, contact/, donar/, security/, tv/
│   └── layout.tsx, page.tsx, sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
├── components/
│   ├── ui/                   # shadcn/ui primitives (button, card, dropdown, table, …)
│   ├── features/             # Movie/TV cards, players, hero, AI recommendations, search
│   ├── layout/                # Navbar, Sidebar, Footer, TV layout wrappers, mobile tab bar
│   ├── admin/, ads/, auth/, editorial/, live-tv/, tv/
├── server/                    # Backend layer — see "Server layer" below
│   ├── services/              # tmdb, ai, embed-extractor, live-tv, admin-settings, admin-logger,
│   │                          #   anime/ y dorama/ (catálogo + registro de proveedores)
│   ├── repositories/          # supabase (server/admin/service-role clients), history
│   └── index.ts               # Public re-export surface (`@/server`)
├── lib/                       # Legacy/utility modules (many still actively used — see below)
│   ├── supabase/              # client.ts (browser), server.ts, admin.ts (legacy clients)
│   ├── tmdb/                  # client.ts, service.ts, helpers.ts (legacy TMDB layer)
│   ├── store/useStore.ts      # Zustand store (favorites, watched, UI state)
│   ├── env.ts                 # Central env var accessors (never throws at module scope)
│   ├── ssrf-guard.ts           # Outbound request validation (SSRF protection)
│   ├── ai-prompt-safety.ts     # Content filter for AI recommendation prompts
│   ├── watch-party*.ts         # Watch Party crypto, sync, cleanup helpers
│   └── ...editorial, genres, rss, scraper, referrals, notifications, og/ (OG image gen)
├── hooks/                     # useFavoritesSync, useKeyboardNavigation, useSpatialNavigation,
│                              #   useFocusManagement, useTVDetection (smart-TV / D-pad support)
├── services/                  # Older service modules (embedExtractor, liveTV)
├── types/                     # Shared TS types (tmdb.ts, watch-party.ts)
└── styles/                    # tw-animate.css

src/middleware.ts              # Auth gating, RBAC, CSP w/ per-request nonce, IP bans, security headers
                               # ⚠️ Must live in src/ — Next looks for it next to `app/`. At the repo
                               # root it is silently ignored from Next 16.3 on (no error, no headers).
                               # ⚠️ Deprecated in Next 16.0: the convention was renamed to `proxy`.
                               # Still works, and `next dev` warns on every boot. Migrating is
                               # `npx @next/codemod@canary middleware-to-proxy .`, but it is NOT a
                               # plain rename: Proxy defaults to the Node.js runtime while this file
                               # currently builds to Edge. Do it as its own change and re-verify the
                               # four things it does (CSP, /admin gate, IP bans, anime 308s).
supabase/migrations/           # SQL migrations (applied to the Supabase project)
scripts/                       # check-env, editorial seeding, watch-party test scripts, security verification
docs/                          # AdSense/ads.txt setup, ad integration guide, public-access migration notes
```

## Server layer (`src/server/`)

This is the **designated single entry point for backend logic** — see
`src/server/README.md` for the full rationale. Key points:

- Layout is MVC-flavoured: `services/` (business logic, no HTTP/cookie awareness),
  `repositories/` (Supabase data access), `controllers/` and `models/` (currently empty,
  to be populated).
- **New code should import from `@/server` or `@/server/services/...` /
  `@/server/repositories/...`**, e.g.:
  ```ts
  import { getTrending, getMovieDetails } from '@/server/services/tmdb';
  import { createSupabaseServerClient } from '@/server/repositories/supabase';
  ```
- **Legacy paths still exist and still work** (`@/lib/tmdb/service`,
  `@/services/embedExtractor`, `@/lib/supabase/*`) — `src/server/**` re-exports
  them during migration. Don't do a mass rewrite; **when you touch a file that
  uses a legacy import, prefer switching it to `@/server/*`** opportunistically.

## Routing & access control

- **Route groups**: `(auth)` = login/register/password flows (redirect to
  `/browse` if already authenticated); `(platform)` = the main authenticated +
  anonymous-friendly app shell.
- **`src/middleware.ts`** is the central gatekeeper. It:
  - Generates a per-request CSP nonce (`x-nonce` header) — **do not add a
    static CSP in `next.config.ts`**, it would override the nonce-based policy.
  - Applies security headers (HSTS, X-Frame-Options, Permissions-Policy, COOP/CORP, etc.) to all responses.
  - Checks `ip_bans` table and returns 403 for banned IPs.
  - Redirects unauthenticated users away from `PROTECTED_PREFIXES`
    (`/favorites`, `/lists`, `/settings`, `/profile`) and `/admin` to `/login?next=...`.
  - Verifies `profiles.role` is `admin`/`super_admin` for `/admin/*`.
  - Validates `next` redirect targets against open-redirect (`SEC-016`).
- **Content routes are intentionally public** (`/`, `/browse`, `/movie`, `/tv`,
  `/search`, `/live-tv`, `/editorial`, `/about`, `/contact`, `/legal`,
  `/security`) — see `docs/PUBLIC_ACCESS_MIGRATION.md` for the rationale and
  what changed. `/watch-party` is deliberately **not** middleware-protected;
  the page itself shows an "inicia sesión" prompt to anonymous visitors.
- API routes, `/auth/*`, and `/_next/*` always pass through middleware untouched.
- **`notFound()` inside a dynamic page returns HTTP 200, not 404.** Verified
  against a production build: `/ruta-inventada` → 404, but `/movie/999999999`,
  `/tv/*`, `/anime/*`, `/editorial/*` and `/genero/*` all answer 200 with the
  not-found screen. Every one of them does emit `noindex`, so the pages are not
  indexed and the cost is crawl budget plus "soft 404" reports in Search
  Console — worth fixing, not urgent. `/doramas` sidesteps it with a real 307
  from `next.config.ts`.

## Supabase conventions

- `src/lib/supabase/client.ts` — browser client (`createClient`).
- `src/lib/supabase/server.ts` — server client (`createClient`, cookie-based),
  `createAdminClient` (service-role, cookie-aware), `createServiceRoleClient`
  (service-role, no cookies — for cron/background jobs).
- **If Supabase env vars are missing, these clients return a "dummy" stub**
  object (no-op queries returning `{ data: null, error: ... }`) instead of
  throwing — this lets the app build/run without Supabase configured. Keep
  this fallback pattern in mind when adding new Supabase-dependent code.
- `getSupabaseConfig()` in `src/lib/env.ts` reads both legacy
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) and new
  (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`) Supabase
  naming — support both when adding new env reads.
- SQL schema changes go in `supabase/migrations/*.sql`, named
  `YYYYMMDD_description.sql`. RLS policies are the source of truth for write
  authorization — middleware/route checks are defense-in-depth, not a
  replacement.

### `profiles.preferences` — never write the column whole

`preferences` is one JSONB column holding **unrelated things that different
features own**: the /settings switches (`notifications`, `privacy`,
`playback`), but also `favorites` (`src/lib/supabase/favorites.ts`) and the
social graph (`friends`, `incomingFriendRequests`, `outgoingFriendRequests`,
see `20260702_atomic_friend_action.sql`).

A settings screen used to do `update({ preferences: newSettings })`, which
replaced the whole column — so flipping one toggle wiped the user's
favourites, friends and pending requests. **All writes go through
`merge_my_preferences(p_patch jsonb)`**, which merges at the top level inside
a single transaction with `for update`, and is reached from TypeScript via
`patchUserPreferences()` in `src/app/actions/settings.ts`. Send only the
groups you are changing.

Shape, defaults and normalisation live in `src/lib/user-preferences.ts`
(`normalizePreferences` tolerates the pre-`playback` layout). Server-side
reads go through `readUserPreferences()` in
`src/server/repositories/user-preferences.ts`.

### Columns closed at the permission layer

`20260826_close_profiles_read.sql` revokes `select`/`update` on
`profiles.preferences` and `select` on `birthdate` from `anon` and
`authenticated` — the column was serving every user's favourites and social
graph to anonymous requests. Access is only via `security definer` functions
from `20260825_privacy_gated_content.sql`:

| Function | Used by |
| --- | --- |
| `get_my_preferences()` | settings, profile, search, `/api/tmdb/*` |
| `merge_my_preferences(jsonb)` | every preferences write |
| `get_public_profile(text)` | `/profile/[username]` |
| `get_public_favorites(uuid,int)` | same, gated by `showWatchlist` |
| `can_view_profile_section(uuid,text)` | `watch_history` RLS |

Column privileges belong to the **role, not the row**, so revoking also locks
out the owner — that is why these functions exist. `role` and `is_banned` are
deliberately **not** revoked: `src/middleware.ts` and
`src/app/admin/layout.tsx` read `profiles.role` with the *session* client, and
both fail closed by redirecting to `/browse`. Revoking it locks everyone out
of `/admin`, super_admin included. Escalation is already blocked by the
trigger in `20251130_security_hardening.sql`.

Watch history lives in `public.watch_history` (RLS-gated by
`showWatchHistory`), not in localStorage as it used to.

## TMDB & images

- `next.config.ts` uses a **custom image loader** (`src/lib/tmdbImageLoader.ts`)
  to map Next's `deviceSizes`/`imageSizes` 1:1 to TMDB's CDN sizes — avoids
  Vercel image-optimization cost. Remote patterns are allow-listed
  (`image.tmdb.org`, the Supabase storage bucket, `images.unsplash.com`).
- TMDB API key: `TMDB_API_KEY` (server) / `NEXT_PUBLIC_TMDB_API_KEY` (client
  fallback). `hasRequiredEnv()` accepts either.

## Security conventions (read before touching auth/network/AI code)

- **SSRF guard** (`src/lib/ssrf-guard.ts`): all outbound fetches to
  user-influenced URLs (embed proxies, scrapers) must go through
  `validateOutboundUrl`/`resolveAndValidate` — blocks private/reserved IPs,
  cloud metadata endpoints, non-HTTP(S) schemes, and dangerous ports.
- **AI prompt safety** (`src/lib/ai-prompt-safety.ts`): user input to the AI
  recommendation feature must pass `assertMovieRecommendationPromptSafe`
  before being sent to the LLM.
- **Open-redirect protection (`SEC-016`)**: any `?next=` / redirect-target
  param must be validated with the `isSafeRedirectPath`-style check (resolve
  against `https://filmify.me` and confirm hostname match) — see
  `src/middleware.ts` and `src/app/(auth)/login/actions.ts`.
- **No secrets in source** (`SEC-017`): test/admin scripts read credentials
  from env vars (`.env.local`), never hardcode them.
- Comment markers like `SEC-0XX` reference items from the November 2025 Red
  Team audit (see `SECURITY.md`) — preserve these comments when refactoring
  the code they document.
- CSP, security headers, and IP-ban checks live in `src/middleware.ts` — see
  "Routing & access control" above.
- **JSON-LD must go through `serializeJsonLd()`** (`src/lib/json-ld.ts`), never
  bare `JSON.stringify`. `stringify` does not escape `<`, so an `</script>`
  inside any field closes the tag and the rest is parsed as HTML. The movie/TV
  structured data is built from `title`, `overview`, cast and production
  company names — all from TMDB, which is **community-editable**, i.e. third
  party input. Five of the seven blocks were unescaped before this was
  centralised.
- **`script-src` has two levels.** The document gets an explicit allow-list
  (`'self'` + googletagmanager + analytics.filmify.me + nonce); only
  `/ads/frame` keeps the permissive `https:`, because ad creatives chain
  scripts across domains that cannot be enumerated — and that route is
  isolated in a sandboxed, opaque-origin iframe (`components/ads/AdBanner.tsx`).
  **Do not put `https:` back on the document policy**: with it, the nonce only
  protects inline scripts and any injected `<script src="https://…">` runs.
  If the Adsterra *native* format is ever enabled
  (`NEXT_PUBLIC_ADSTERRA_NATIVE_SRC`, empty today) its script is injected into
  the main document and its origin must be added to the allow-list.
- **PostgREST filter injection**: user text interpolated into `.or(...)` is
  parsed as filter syntax — commas separate conditions, parentheses group. The
  friend search broke on any name containing a comma and accepted extra
  conditions. Strip everything except letters, digits, spaces and `.'-`
  (`%` and `_` are ILIKE wildcards) before building the expression.

## State management & UI

- Global client state: `src/lib/store/useStore.ts` (Zustand + localStorage
  persistence under key `filmify-storage`). Holds favorites, watched items,
  and UI state (menu, search query, sidebar). Use the exported selector hooks
  (`useFavorites`, `useIsSidebarCollapsed`, etc.) rather than subscribing to
  the whole store.
- `useFavoritesSync` merges localStorage favorites into Supabase on login.
- UI components follow shadcn/ui conventions (`components.json`: style
  "new-york", base color "neutral", icon library `lucide-react`, CSS vars).
  Use the `cn()` helper (`src/lib/utils.ts`, clsx + tailwind-merge) for
  conditional classNames.
- TV / smart-TV support: `src/lib/detectTV.ts`, `device-detection.ts`,
  `useTVDetection`, `useSpatialNavigation`, `useKeyboardNavigation`,
  `useFocusManagement`, and `tv-mode` class on `<body>`. Some routes have a
  parallel `page-tv.tsx` for the TV-optimized layout (e.g. `browse`, `search`).
- **Cards must be real links.** `MovieCard` navigates via an `<a>` overlay
  (`absolute inset-0`), not `onClick` + `router.push` on a `<div>` — the old
  version did nothing until hydration, which on content-heavy pages is late
  enough that clicks were dropped. The overlay sits *beside* the card rather
  than wrapping it because the favourite button is interactive content and
  cannot nest inside an `<a>`; decorative layers are `pointer-events-none`.
- **Horizontal rails clip hover shadows.** `overflow-x-auto` forces
  `overflow-y: auto`, so a lifted card gets cut off — rails need vertical and
  lateral padding. And `animate-fade-in-up` uses `fill-mode: both`, leaving a
  transform in place that creates a stacking context: `hover:z-10` must go on
  the grid cell, not on the card inside it.
- **Avoid hidden-scroll UI.** A `overflow-x-auto` + `scrollbar-hide` row has no
  affordance and a mouse wheel does not scroll it horizontally; the anime genre
  chips were unreachable that way. Prefer wrapping, with a collapse + "show
  all" toggle on small screens.
- **No settings switch without something behind it.** `/settings` used to have
  eight toggles that only wrote to the DB — the notifications cron ignored them
  and nothing read `adultContent`, `autoplay` or `language`. If a preference
  has no consumer, do not ship the switch. Reduced motion is a class on
  `<html>` (`src/lib/reduced-motion.ts` + `.reduce-motion` in globals.css);
  `adultContent` drives `include_adult` on TMDB search.

## Language & content conventions

- **UI strings, user-facing copy, and most code comments are in Spanish**
  (the site targets es-ES users). Match this when adding strings or comments
  in existing files. New comments should still follow the "why, not what"
  rule from general engineering practice.
- Editorial articles (`src/app/editorial/`, `src/lib/editorial*.ts`, seeded
  via `scripts/seed-editorial.mjs` / `editorial-content-*.mjs`) are SEO blog
  content. `next.config.ts` `redirects()` contains a large list of 301s for
  retired editorial slugs — append new ones there rather than letting old
  URLs 404.

## Development workflow

```bash
npm install
cp .env.example .env.local   # fill in keys — see comments in .env.example for what's required
npm run dev                  # Next.js dev server (Turbopack), http://localhost:3000
npm run build                # production build (Turbopack)
npm run lint                 # eslint .
npm run check-env            # verifies required vars exist in .env.local
```

- **Minimum viable local setup**: `TMDB_API_KEY` / `NEXT_PUBLIC_TMDB_API_KEY`.
  Without Supabase configured, auth-gated features no-op gracefully (dummy
  clients) — content browsing still works.
- **No automated test suite** (no `test` script in `package.json`). Validation
  happens via `npm run build` (TS strict + lint) and manual scripts in
  `scripts/` (e.g. `test-party-*.mjs` for Watch Party, `verify_security.ts`
  for RLS/IDOR checks — these hit a real Supabase project via env vars).
- **ESLint**: active config is `.eslintrc.cjs` (ESLint 8 style,
  `next/core-web-vitals` + `@typescript-eslint/recommended`, several rules
  downgraded to `warn`). `eslint.config.mjs.disabled` is a prepared ESLint v9
  flat-config migration — not active; don't assume it's in effect.
- **Path alias**: `@/*` → `src/*` (see `tsconfig.json`).

## Deployment

- **Real production runs on AWS EC2** (inside a VPC), not Vercel or Cloudflare.
  `.github/workflows/deploy.yml` triggers on push to `main`: it SSHes into the
  EC2 host and runs `git fetch origin main`, `git merge --ff-only`, `npm ci`,
  `npm run build`, then `pm2 reload filmify` (PM2 in cluster mode). The step
  sets `script_stop: true`: without it `appleboy/ssh-action` keeps going after
  a failed command, which is how the deploy spent 2026-08-04 → 08-18 aborting
  on `git pull` (a `package-lock.json` dirtied by `npm install` on the host)
  and then happily rebuilding the same stale commit, reporting green. `npm ci`
  instead of `npm install` keeps the lockfile from drifting again. Docker and Nginx sit on the
  EC2 host in front of/around the app (Nginx as reverse proxy) — their config
  is **not** in this repo; it's managed directly on the host.
- **Watch the disk.** `.next/cache/fetch-cache` (Next's Data Cache) is never
  pruned and every `revalidate`d fetch lands there — TMDB, AniList and every
  per-title availability probe. It reached 11 GB of a 28 GB volume by
  2026-08-19. Deleting it is safe (it regenerates); a nightly
  `find … -mtime +2 -delete` keeps it bounded.
- **Cloudflare Workers is not the production runtime.** The `wrangler.jsonc` /
  `open-next.config.ts` / `custom-worker.ts` setup exists to (1) verify the
  build compiles/deploys cleanly as a Worker, and (2) Cloudflare manages the
  `filmify.me` domain/DNS. A green Cloudflare deploy does not mean prod is
  updated — the EC2 deploy via GitHub Actions is what actually matters.
  - `wrangler.jsonc`'s `triggers.crons` is dead documentation — it describes
    the intent but nothing actually invokes it; it never fires against
    production. **The real cron trigger is the `ubuntu` user's crontab on the
    EC2 host** (`crontab -l` / `/var/spool/cron/crontabs/ubuntu`, server
    timezone `Etc/UTC` so schedule times below are literal UTC):
    ```
    0 0 * * * /home/ubuntu/scripts/run-cron.sh /api/cron/cleanup
    0 6 * * * /home/ubuntu/scripts/run-cron.sh /api/cron/rss
    0 9 * * * /home/ubuntu/scripts/run-cron.sh /api/cron/notifications
    ```
    `run-cron.sh` loads `/home/ubuntu/filmify/.env.local`, calls
    `https://filmify.me$ROUTE` with `Authorization: Bearer $CRON_SECRET` and
    an `X-Cron-Trigger: system-cron` header, and logs to
    `/home/ubuntu/logs/cron-<route>.log`. Confirmed via nginx access logs
    (exactly one request per route per day, no Cloudflare-triggered
    duplicates) and journald timing (cron fires at :00:01, nginx receives the
    request 1-4s later — the Cloudflare round trip).
  - Cron routes are protected by `CRON_SECRET`, sourced from `.env.local` on
    the EC2 host (same file the app reads, so it can't drift out of sync).
- `vercel.json` is fully unused (`_LEGACY`, kept only for its cron-schedule
  reference) — Vercel is not part of the deployment pipeline at all.
- `poweredByHeader: false` and no framework fingerprinting — keep it that way for SEO/security hygiene.

## Git workflow

- `main` is the production branch; day-to-day work merges via PRs from a
  `dev` branch (see commit history: `Merge pull request #N from
  ColoradoDevv/dev`). Commit messages follow conventional-commit-style
  prefixes (`feat:`, `fix:`, `refactor:`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
