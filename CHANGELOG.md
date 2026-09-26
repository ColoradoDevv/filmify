# Changelog

Todos los cambios reseñables de FilmiFy.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado, [SemVer](https://semver.org/lang/es/).

---

## [2.1.0] — 2026-09-26

### ✨ Nuevo

- **Reproductor con servidores de respaldo.** Si el servidor en uso falla,
  la reproducción cambia sola al siguiente (cascada Vimeus → VidAPI →
  VidCore → VidSrc → …), con selector manual en películas, series y
  Watch Party.
- **Fichas con caché de 1 hora** (`/movie`, `/tv`): visitas repetidas y
  prefetch instantáneos; el reproductor sigue resolviendo en vivo.
- **Tráiler alternativo cacheado** 30 días: solo el primer visitante paga la
  búsqueda con IA.

### ⚡ Rendimiento

- **Circuit breaker por proveedor** (`provider-health.ts`): 3 fallos de
  red/5xx abren el circuito 3 minutos con fail-open inmediato, en vez de
  quemar el timeout en cada sonda.
- Sondas más cortas y 12 recomendaciones sondeadas por ficha en vez de 18.
- Hero de la home en `w1280` en vez de `original`.
- `auth.getUser()` del middleware, cacheado 60 s por token.

### 🐞 Corregido

- Se solucionaron errores de reproducción: el avance automático de servidor
  fallaba al primer intento, la sonda descartaba proveedores sanos detrás
  de Cloudflare y el caché de sondas crecía sin tope.

## [2.0.0] — 2026-08-25

> ### ⚠️ Antes de desplegar: el orden importa
>
> Esta versión revoca columnas de `public.profiles`, así que **el código nuevo y
> la base de datos tienen que avanzar en este orden exacto**:
>
> ```
> 1. Aplicar  supabase/migrations/20260825_privacy_gated_content.sql   (aditiva, sin riesgo)
> 2. Desplegar el código  (merge a main → GitHub Actions → EC2)
> 3. Aplicar  supabase/migrations/20260826_close_profiles_read.sql     (revoca permisos)
> ```
>
> Saltarse el paso 2 deja al código desplegado sin acceso a `preferences`: los
> ajustes y los favoritos dejan de funcionar. Entre el paso 1 y el 3 no se rompe
> nada; solo sigue abierta la fuga que el paso 3 cierra.
>
> Cada migración lleva su propio bloque de *rollback* comentado al final.

### 💥 Cambios que rompen compatibilidad

- **Live TV deja de estar accesible.** El proveedor de canales se volvió poco
  fiable; `/live-tv` y `/api/channels` sirven un marcador de "próximamente".
  La implementación sigue en el repo, intacta.
- **Doramas deja de estar accesible** en todos los entornos. APIPlayer, que
  cubría la mitad del catálogo, empezó a exigir verificación antibot.
  `/doramas` redirige a `/browse?category=tv`. Se reabre con
  `NEXT_PUBLIC_DORAMAS_ENABLED=1`.
  La capa `@/server/services/dorama` **sigue activa**: resuelve la reproducción
  de todas las series de `/tv/[id]`, no solo la de doramas.
- **`profiles.preferences` y `birthdate` quedan cerradas** a `anon` y
  `authenticated`. Todo acceso pasa por funciones `security definer`.
- **Ajustes pierde cuatro interruptores**: idioma, reproducción automática,
  actividad de amigos y ofertas. Ninguno tenía nada detrás.
- **AdSense y Vercel Analytics retirados**, sustituidos por Adsterra y GA4/Umami.
- **El captcha deja de ser obligatorio** en el inicio de sesión.

### ✨ Nuevo

- **Privacidad real en el perfil público.** Los interruptores se aplican en
  Postgres, no en el cliente: `get_public_profile`, `get_public_favorites`,
  `can_view_profile_section`, `get_my_preferences` y `merge_my_preferences`.
- **Historial de visionado** en servidor (`public.watch_history`, con RLS), que
  antes solo vivía en el `localStorage` de cada navegador.
- **Ajustes rediseñado**: filas de lista densas, y las preferencias que quedan
  hacen algo de verdad — el cron respeta las notificaciones, «reducir
  movimiento» apaga las animaciones de todo el sitio y «contenido para adultos»
  gobierna `include_adult` en las búsquedas.
- **Home rediseñada**: acceso rápido a todos los módulos y carril de novedades
  con el último título en formato apaisado.
- **Ficha informativa** cuando un título existe en TMDB pero ningún proveedor lo
  tiene: sinopsis, reparto, tráiler, recomendaciones y reseñas, sin reproductor,
  en lugar de un 404.
- **Buscador único** en el navbar, a pantalla completa en móvil, con recientes
  filtradas, resaltado de coincidencias y borrado por elemento.
- **Módulo de anime** con varios proveedores, grilla paginada y filtros que se
  ven enteros.
- **Publicidad**: zonas 300x250 y 320x50, formato por contenedor, consentimiento
  geolocalizado y creativo aislado en un iframe de origen opaco.
- **Open Graph dinámico** en fichas de películas, series y anime.

### ⚡ Rendimiento

- **Sugerencias de búsqueda de 1,2 s a 0,2 s.** El desplegable llamaba a la
  búsqueda completa, que sondea el proveedor título a título y pide a AniList el
  id de cada anime. Ahora usa una consulta ligera y un mapa estático en memoria.

### 🔒 Seguridad

- **XSS almacenado vía JSON-LD.** `JSON.stringify` no escapa `<`, y el JSON-LD
  se construye con datos de TMDB, que es editable por su comunidad. Centralizado
  en `serializeJsonLd()` y aplicado en los ocho bloques.
- **`script-src` en dos niveles.** Llevaba `https:`, que permite cualquier
  origen HTTPS y dejaba el nonce sirviendo solo para scripts inline. El
  documento pasa a una lista explícita; el permisivo queda para `/ads/frame`,
  que está aislado.
- **Inyección de filtros de PostgREST** en la búsqueda de amigos: el texto
  entraba sin escapar en una expresión `or=(…)`, donde la coma separa
  condiciones.
- **Rutas internas validadas** en un solo sitio (`@/lib/safe-path`), compartido
  por el middleware, el login y las tarjetas.
- **SSRF y cadena de formato** en el cliente de TMDB (alertas de CodeQL).
- `postcss@8.5.25` forzado para mitigar CVE-2026-45623; cerradas 6 alertas de
  Dependabot.

### 🐛 Correcciones

- **Pérdida de datos en ajustes**: guardar un interruptor sobrescribía la
  columna `preferences` entera y se llevaba por delante favoritos, amistades y
  solicitudes pendientes.
- **Amigos que desaparecían**: un `limit(30)` se aplicaba a la suma de amigos +
  solicitudes, así que a partir de 30 relaciones había solicitudes imposibles de
  aceptar.
- **Notificaciones que llevaban a un 404**: el cron avisaba de títulos que
  ningún proveedor tenía.
- **Tarjetas que no se podían pulsar**: navegaban con `router.push` sobre un
  `div`, así que no hacían nada hasta que hidrataba el JS.
- **Filtros de anime inalcanzables** y **pestañas de ajustes cortadas** en
  móvil: filas con scroll oculto sin ninguna pista de que hubiera más.
- **El middleware no se cargaba**: estaba en la raíz y Next lo busca junto a
  `app/`. Movido a `src/`.
- Sombras recortadas en carruseles y grillas, `DEP0169` al renderizar fichas,
  columna `profiles.is_stb` ausente, y el modelo de IA migrado a
  `openai/gpt-oss-120b`.

### 📚 Documentación

- `CLAUDE.md` amplía las convenciones de Supabase, la política de CSP, las
  trampas de PostgREST y el estado de los módulos cerrados.
- Corregida la documentación de despliegue para reflejar el montaje real
  (EC2 + PM2 + Nginx), no Vercel.

---

## [1.0.0] — 2026-08-03

Primera versión etiquetada. Catálogo, búsqueda, reproducción, cuentas,
favoritos, listas, reseñas, watch party, editorial y panel de administración.

[2.0.0]: https://github.com/ColoradoDevv/filmify/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ColoradoDevv/filmify/releases/tag/v1.0.0
