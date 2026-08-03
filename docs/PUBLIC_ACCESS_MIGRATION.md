# Migración a plataforma pública (sin login obligatorio)

Fecha: 2026-06-10

## 1. Investigación previa — arquitectura encontrada

**Stack:** Next.js 15 (App Router) + React 19, Supabase (auth SSR vía cookies con `@supabase/ssr`), Tailwind CSS 4, TMDB como fuente de catálogo, despliegue en Vercel. Estado cliente con Zustand (favoritos persistidos localmente y sincronizados a `profiles.preferences` en Supabase).

**Arquitectura de autenticación previa:** el gating estaba centralizado en `middleware.ts`. Las páginas no validaban sesión por sí mismas; el middleware redirigía a `/login` cualquier ruta en `PROTECTED_PREFIXES` (que incluía `/browse`, `/movie`, `/tv`, `/search`, `/live-tv` además de las personales). Existían bypasses por User-Agent para crawlers (SEO) y dispositivos TV. La reproducción estaba además bloqueada en el servidor: los proxies de streaming (`/api/stream`, `/api/stream/health`, `/api/proxy/latino`, `/api/proxy/superembed`) exigían sesión (SEC-021).

**Homepage previa:** `/` era una landing de marketing cuyo CTA principal apuntaba a `/login`.

## 2. Cambios realizados

### Rutas públicas (`middleware.ts`)
- `PROTECTED_PREFIXES` queda reducido a rutas personales: `/favorites`, `/lists`, `/settings`, `/profile`, `/watch-party`. `/admin` sigue exigiendo rol admin.
- `/`, `/browse`, `/movie/*`, `/tv/*`, `/search`, `/live-tv`, `/editorial` son públicas: se sirven sin validación de token.
- Eliminados los bypasses de crawler/TV (innecesarios: todos ven el mismo contenido público). SEO y previews sociales funcionan de forma nativa.
- Sesión con refresh token inválido: se limpian las cookies `sb-*`; solo se redirige a `/login` si la ruta es personal/admin, en rutas públicas el visitante continúa anónimo.
- Se conservan: cabeceras de seguridad, CSP con nonce, chequeo de IP bans y redirección de usuarios logueados fuera de las páginas de auth.

### Reproducción pública (API)
Se eliminó el requisito de sesión en `/api/stream` (GET), `/api/stream/health`, `/api/proxy/latino` y `/api/proxy/superembed`. Se mantienen intactas las protecciones técnicas: SSRF guard (`validateOutboundUrl`), allowlist estricta de dominios embed, validación de `imdb_id`, y el chequeo de IP bans en middleware.

### Homepage (`src/app/page.tsx`)
Reescrita como catálogo público estilo Cuevana/PelisPlus: hero con la película #1 en tendencia y botón «Ver ahora» (→ `/movie/[id]`), búsqueda prominente, scroller de tendencias del día, fila «Series populares» y grid completo «Películas en tendencia» con enlaces a `/browse`. Metadata y JSON-LD actualizados al posicionamiento público.

### Navegación
- `Navbar` (público): enlaces de contenido (Explorar, TV en Vivo, Editorial) y barra de búsqueda visibles para todos; «Favoritos» solo con sesión; a la derecha, avatar/notificaciones con sesión o «Iniciar Sesión / Crear Cuenta» sin ella.
- `MobileMenu`: visitantes anónimos ven primero el contenido (Explorar, Series, TV en Vivo, Editorial) y el login como mejora opcional («guarda favoritos y comenta»).
- `PlatformHeader` (shell del catálogo): botón «Iniciar sesión» para anónimos; eliminada la redirección forzada a `/login` al expirar la sesión.

### Auth opcional (sin cambios necesarios — ya degradaba bien)
- **Comentarios** (`ReviewsSection`): ya muestra CTA «Inicia sesión» a anónimos; escribir requiere cuenta.
- **Favoritos**: anónimos guardan localmente (Zustand); la persistencia en Supabase (`saveFavoritesToSupabase`) es no-op sin sesión y se hace merge al iniciar sesión.
- Las rutas personales redirigen a `/login?next=<destino>` y vuelven tras autenticarse.

## 3. Seguridad y consideraciones

- RLS de Supabase intacta: las escrituras (reviews, favoritos, perfiles) siguen exigiendo sesión a nivel de base de datos.
- Los proxies públicos aumentan la superficie de consumo anónimo. Mitigaciones vigentes: allowlists de dominios, SSRF guard, IP bans. **Recomendado a futuro:** rate limiting por IP en los proxies (p. ej. Vercel WAF o Upstash Ratelimit).
- `robots.ts` y `sitemap.ts` ya estaban alineados (contenido indexable, rutas personales en disallow).

## 4. Verificación

`tsc --noEmit` sobre el proyecto completo con los cambios: sin errores. Se recomienda `npm run build` + smoke test local (`/`, `/movie/[id]` anónimo, reproducción, login → favoritos) antes de desplegar.
