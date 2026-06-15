# CLAUDE.md

Guidance for AI assistants (Claude Code) working in this repository.

## Project overview

**FilmiFy** is a Spanish-language (es-ES) streaming discovery platform — a
"where to watch" catalog for movies and TV shows, built with **Next.js 15
(App Router, Turbopack, React 19)**. It is a public site: catalog browsing,
search, and playback work for anonymous visitors; an account (Supabase Auth)
unlocks favorites, lists, reviews, watch parties, and notifications. There is
also an admin dashboard for content/user/editorial moderation.

Additional bolted-on features: a Live TV section, an editorial/blog section
(SEO articles), a synchronized "Watch Party" feature, and a World Cup 2026
live-scores/streaming section (`/mundial`).

## Tech stack

- **Framework**: Next.js 15.5 (App Router), Turbopack, React 19, TypeScript (strict)
- **Styling**: Tailwind CSS v4, shadcn/ui ("new-york" style, Radix primitives), `lucide-react` icons
- **State**: Zustand (`src/lib/store/useStore.ts`), persisted to localStorage
- **Auth/DB**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres + RLS
- **Content data**: TMDB (The Movie Database) API
- **AI**: Groq SDK for recommendations
- **Other integrations**: Resend (email), hCaptcha, Vercel Analytics/Speed Insights, Google Analytics, football-data.org (World Cup)
- **Player**: hls.js + third-party embed providers (Vimeus, SuperEmbed, "Latino" proxy)

## Repository structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Route group: login, register, password reset, confirm-email
│   ├── (platform)/           # Route group: browse, search, favorites, lists, profile,
│   │                          #   settings, live-tv, watch-party, mundial (World Cup)
│   ├── admin/                 # Admin dashboard (RBAC-gated: admin/super_admin role)
│   ├── api/                   # Route handlers (proxies, cron jobs, watch-party, stream health…)
│   ├── actions/               # Top-level Server Actions (catalog, search, streams, ai, vidsrc)
│   ├── editorial/             # SEO blog/news articles
│   ├── legal/, about/, contact/, donar/, security/, tv/
│   └── layout.tsx, page.tsx, sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
├── components/
│   ├── ui/                   # shadcn/ui primitives (button, card, dropdown, table, …)
│   ├── features/             # Movie/TV cards, players, hero, AI recommendations, search
│   ├── layout/                # Navbar, Sidebar, Footer, TV layout wrappers, mobile tab bar
│   ├── admin/, ads/, auth/, editorial/, live-tv/, tv/, worldcup/
├── server/                    # Backend layer — see "Server layer" below
│   ├── services/              # tmdb, ai, embed-extractor, live-tv, admin-settings, admin-logger
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
├── services/                  # Older service modules (embedExtractor, liveTV, worldcup)
├── types/                     # Shared TS types (tmdb.ts, watch-party.ts)
└── styles/                    # tw-animate.css

middleware.ts                  # Auth gating, RBAC, CSP w/ per-request nonce, IP bans, security headers
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
- **`middleware.ts`** is the central gatekeeper. It:
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
  `middleware.ts` and `src/app/(auth)/login/actions.ts`.
- **No secrets in source** (`SEC-017`): test/admin scripts read credentials
  from env vars (`.env.local`), never hardcode them.
- Comment markers like `SEC-0XX` reference items from the November 2025 Red
  Team audit (see `SECURITY.md`) — preserve these comments when refactoring
  the code they document.
- CSP, security headers, and IP-ban checks live in `middleware.ts` — see
  "Routing & access control" above.

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

- Target platform: Vercel (`vercel.json` defines cron schedules):
  - `/api/cron/cleanup` — daily at 00:00 (stale watch-party rooms, expired data)
  - `/api/cron/notifications` — daily at 09:00
  - `/api/cron/rss` — daily at 06:00 (editorial RSS ingestion)
  - Cron routes are protected by `CRON_SECRET`.
- `poweredByHeader: false` and no framework fingerprinting — keep it that way for SEO/security hygiene.

## Git workflow

- `main` is the production branch; day-to-day work merges via PRs from a
  `dev` branch (see commit history: `Merge pull request #N from
  ColoradoDevv/dev`). Commit messages follow conventional-commit-style
  prefixes (`feat:`, `fix:`, `refactor:`).
