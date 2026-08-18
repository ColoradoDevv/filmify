<p align="center">
  <img src="public/logo-full.svg" alt="FilmiFy" width="320" />
</p>

<p align="center">
  Catálogo de "dónde ver" películas y series — descubre, busca y reproduce, con cuentas, listas, reseñas, Watch Party, TV en vivo y un panel de administración.
</p>

<p align="center">
  <a href="https://filmify.me"><img src="https://img.shields.io/badge/sitio-filmify.me-6366f1?style=flat-square" alt="Sitio en producción" /></a>
  <img src="https://img.shields.io/badge/Next.js-15.5-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 15.5" />
  <img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript estricto" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/licencia-privada-lightgrey?style=flat-square" alt="Licencia privada" />
</p>

---

## ✨ Qué es FilmiFy

**FilmiFy** es una plataforma de streaming/discovery en español (es-ES)
construida con **Next.js 15 (App Router, Turbopack, React 19)**. Es un sitio
público: el catálogo, la búsqueda y la reproducción funcionan para
visitantes anónimos. Crear una cuenta (Supabase Auth) desbloquea favoritos,
listas, reseñas, salas de "Watch Party" y notificaciones. También incluye un
panel de administración para moderación de contenido, usuarios y editorial.

Funcionalidades adicionales: sección de **TV en Vivo**, un blog/editorial
(artículos SEO), y una función de **Watch Party** sincronizada.

## 🧱 Stack técnico

- **Framework**: Next.js 15.5 (App Router), Turbopack, React 19, TypeScript (modo estricto)
- **Estilos**: Tailwind CSS v4, shadcn/ui (estilo "new-york", primitivas Radix), iconos `lucide-react`
- **Estado**: Zustand (`src/lib/store/useStore.ts`), persistido en `localStorage`
- **Auth/BD**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres + RLS
- **Datos de contenido**: API de TMDB (The Movie Database)
- **IA**: Groq SDK para recomendaciones
- **Otras integraciones**: Resend (email), hCaptcha, Vercel Analytics/Speed Insights, Google Analytics
- **Reproductor**: hls.js + proveedores de embeds de terceros (Vimeus, SuperEmbed, proxy "Latino")

## 📂 Estructura del proyecto

```
src/
├── app/              # Next.js App Router (rutas, layouts, server actions)
│   ├── (auth)/        # login, registro, recuperación de contraseña
│   ├── (platform)/    # browse, búsqueda, favoritos, listas, perfil, live-tv, watch-party
│   ├── admin/          # Panel de administración (RBAC: admin/super_admin)
│   ├── api/            # Route handlers (proxies, crons, watch-party, salud de streams…)
│   └── actions/        # Server Actions de nivel superior (catálogo, búsqueda, streams, IA)
├── components/        # UI (shadcn/ui), features, layout, admin, editorial, live-tv…
├── server/             # Capa backend (servicios + repositorios) — punto de entrada `@/server`
├── lib/                # Utilidades y módulos legados (Supabase, TMDB, store, seguridad…)
├── hooks/              # Hooks compartidos (favoritos, navegación TV/D-pad, etc.)
├── services/           # Servicios antiguos (embeds, Live TV)
└── types/              # Tipos TS compartidos (TMDB, Watch Party)

middleware.ts           # Auth, RBAC, CSP con nonce, bans de IP, cabeceras de seguridad
supabase/migrations/    # Migraciones SQL del proyecto Supabase
android-app/            # Proyecto Android (TWA) que empaqueta el sitio como app nativa
scripts/                # Verificación de entorno, seed de editorial, pruebas de Watch Party, seguridad
docs/                    # Guías operativas: ads.txt/AdSense, empaquetado Android (TWA),
                         # plantillas de email de Supabase, notas de migración a acceso público
```

Para una guía más detallada de arquitectura y convenciones (pensada para
asistentes de IA, pero útil para cualquier dev), consulta
[`CLAUDE.md`](./CLAUDE.md).

## 🚀 Cómo empezar

```bash
npm install
cp .env.example .env.local   # rellena las claves — ver comentarios en .env.example
npm run dev                  # servidor de desarrollo (Turbopack) en http://localhost:3000
```

**Configuración mínima local**: solo necesitas `TMDB_API_KEY` /
`NEXT_PUBLIC_TMDB_API_KEY` para navegar el catálogo. Sin Supabase
configurado, las funciones que requieren cuenta (favoritos en la nube,
reseñas, admin, etc.) se degradan de forma segura (clientes "dummy" que no
rompen el build ni el servidor).

### Scripts disponibles

| Comando              | Descripción                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo con Turbopack                   |
| `npm run build`       | Build de producción (Turbopack)                        |
| `npm run start`       | Sirve el build de producción                           |
| `npm run lint`        | ESLint sobre todo el proyecto                          |
| `npm run check-env`   | Verifica que `.env.local` tenga las variables requeridas |

Para empaquetar la web como un APK Android usando Trusted Web Activity (TWA), consulta [`docs/ANDROID_TWA.md`](./docs/ANDROID_TWA.md).

No hay un suite de tests automatizado (`npm test`); la validación se hace con
`npm run build` (TypeScript estricto + ESLint) y scripts manuales en
`scripts/` (p. ej. `test-party-*.mjs` para Watch Party, `verify_security.ts`
para comprobaciones de RLS/IDOR contra un proyecto Supabase real).

## 🔑 Variables de entorno

Todas las variables están documentadas con comentarios en
[`.env.example`](./.env.example). Resumen:

- **Requerido**: `TMDB_API_KEY` / `NEXT_PUBLIC_TMDB_API_KEY` (contenido de catálogo).
- **Requerido en producción**: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auth,
  favoritos, admin, reseñas, watch party).
- **Opcional**: claves de Vimeus, Groq (IA), Resend (contacto), `CRON_SECRET`
  (jobs programados), `PORTAL_DEVICE_SECRET` (STB), hCaptcha, donaciones,
  analítica/ads.

## 🛡️ Seguridad

FilmiFy pasó por una auditoría de Red Team (noviembre 2025) — ver
[`SECURITY.md`](./SECURITY.md) y la página pública [`/security`](src/app/security).
Convenciones clave a respetar al tocar código de red/auth/IA:

- **SSRF guard** (`src/lib/ssrf-guard.ts`): toda petición saliente influida
  por el usuario (proxies de embeds, scraper) debe validarse con
  `validateOutboundUrl` / `resolveAndValidate`.
- **Filtro de prompts de IA** (`src/lib/ai-prompt-safety.ts`): el texto del
  usuario para recomendaciones debe pasar
  `assertMovieRecommendationPromptSafe`.
- **Protección de open-redirect** (`SEC-016`): cualquier parámetro `?next=`
  debe validarse contra `https://filmify.me` antes de redirigir.
- **CSP con nonce por request**, cabeceras de seguridad y bans de IP se
  gestionan en `middleware.ts` — no añadas una CSP estática en
  `next.config.ts`.

Para reportar una vulnerabilidad: **security@filmify.com**.

## ☁️ Despliegue

**Producción corre en AWS EC2**, no en Vercel ni en Cloudflare. Al hacer push
a `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) se
conecta por SSH al servidor y ejecuta `git pull`, `npm install`, `npm run
build` y `pm2 reload filmify` (PM2 en modo cluster). Nginx y Docker corren en
el mismo host como reverse proxy / contenedores — su configuración vive en el
servidor, no en este repo.

Cloudflare Workers (`wrangler.jsonc`, `open-next.config.ts`) **no sirve
tráfico de producción**: solo verifica que el build compile como Worker, y
Cloudflare gestiona el dominio/DNS de `filmify.me`. Un deploy verde en
Cloudflare no implica que producción esté actualizada.

Las tareas programadas corren desde el **crontab del propio servidor EC2**
(no desde `wrangler.jsonc`, que solo documenta la intención pero nunca se
dispara contra producción):

- `/api/cron/cleanup` — diario a las 00:00 UTC (limpieza de salas Watch Party y datos caducados)
- `/api/cron/rss` — diario a las 06:00 UTC (ingestión RSS editorial)
- `/api/cron/notifications` — diario a las 09:00 UTC

Las rutas de cron están protegidas por `CRON_SECRET`.

## 📄 Licencia

Proyecto privado — todos los derechos reservados.
