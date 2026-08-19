# Publicidad — configuración de Adsterra

La monetización del sitio corre **solo con Adsterra**. Google AdSense se
retiró por completo (agosto 2026): nunca llegó a servir un anuncio, sus
políticas no admiten un catálogo que reproduce contenido de terceros, y su
línea en `ads.txt` estaba haciendo daño (ver más abajo).

## Arquitectura

| Pieza | Archivo |
|---|---|
| Claves de zona | `getAdsConfig()` en `src/lib/env.ts` |
| Banner (4 formatos) | `src/components/ads/AdBanner.tsx` |
| Hueco responsive | `src/components/ads/AdSlot.tsx` |
| Consentimiento | `src/lib/cookie-consent.ts` + `src/middleware.ts` |
| Medición | `trackAdView()` en `src/lib/analytics.ts` |

En las páginas se usa siempre `<AdSlot />`, nunca `AdBanner` directamente:

```tsx
import { AdSlot } from '@/components/ads';

<AdSlot />                      {/* 728x90 en escritorio, 320x50 en móvil */}
<AdSlot variant="inline" />     {/* 300x250 en escritorio, 320x50 en móvil */}
<AdSlot variant="player" />     {/* Native Banner 4:1 en escritorio, 320x50 en móvil */}
```

### Por qué el nativo va bajo el reproductor

Es lo que recomienda la guía de Native Ads de Adsterra para páginas con vídeo:
*"Under the player — 4x1 widget"* en escritorio. El widget ocupa el ancho del
player y se lee como contenido del sitio, que es justo de donde sale su CTR.

En móvil ese hueco sirve el 320x50, no el nativo: el layout del widget es
**único por zona** (una sola unidad Native Banner por sitio) y está en 4:1,
que en un ancho de móvil sale apretado — la propia guía avisa de que el widget
hay que ajustarlo por dispositivo o "se verá raro". La guía sugiere 1x1 o 1x4
para móvil; si algún día Adsterra permite una segunda unidad nativa, ese es el
cambio que toca.

El layout se cambia desde el propio panel (**GET CODE → Widget layout → SAVE**),
sin tocar código: la URL del script y el id del contenedor no cambian.

**Una sola zona por hueco.** Renderizar la variante de móvil y la de
escritorio a la vez escondiendo una con CSS genera impresiones de anuncios que
nadie ve — eso es tráfico inválido y es motivo de baja en cualquier red.

**Máximo 2 unidades por vista.** Más no reparte más dinero: reparte las mismas
impresiones entre más huecos y hunde el CTR de todos.

## Variables de entorno

Cada zona del panel tiene su propia clave, y la clave lleva el tamaño dentro:
una creada como 728x90 devuelve vacío si se pide para un hueco de 320x50.

```
NEXT_PUBLIC_ADSTERRA_KEY_728X90=
NEXT_PUBLIC_ADSTERRA_KEY_300X250=
NEXT_PUBLIC_ADSTERRA_KEY_320X50=
NEXT_PUBLIC_ADSTERRA_NATIVE_SRC=
NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER_ID=
```

Son **públicas** (viajan en el HTML como cualquier tag publicitario), así que
no aplica SEC-017. Se leen en tiempo de build: hay que redesplegar tras
cambiarlas en el `.env.local` del host EC2.

Las tres zonas de banner ya llevan su clave real como valor por defecto en
`getAdsConfig()`, así que funcionan sin configurar nada; las variables sirven
para rotar una zona sin tocar código. El Native Banner sí depende de sus dos
variables: mientras estén vacías, `variant="native"` no renderiza nada.

## Códigos: "iFrame Sync" vs "JSAsync"

El panel ofrece dos variantes del mismo anuncio. Hoy usamos la de **iFrame
Sync**, que llama a `document.write()` — los navegadores lo ignoran en
silencio si el script se inyecta de forma asíncrona, así que se ejecuta dentro
de un iframe same-origin propio (ver el comentario en `AdBanner.tsx`).

Si Adsterra entrega la variante **JSAsync** de una zona, ese rodeo sobra y el
anuncio puede montarse directamente en el documento. Merece la pena pedirla.

El **Native Banner** ya es async por diseño: script + `<div>` contenedor en el
documento principal, sin iframe.

## ads.txt

⚠️ **Ahora mismo el sitio NO sirve `ads.txt`, a propósito.**

Antes existía `public/ads.txt` con una única línea de `google.com`. Según la
especificación de IAB, cuando un dominio publica `ads.txt` los compradores
tratan como **no autorizado** a cualquier vendedor que no aparezca en él. O
sea: el archivo autorizaba a AdSense (que no servía nada) y marcaba como no
autorizado a Adsterra (que sí sirve). Es candidato serio a explicar el CPM de
$0.16 que se veía en el panel.

Sin archivo no hay restricción, así que el estado actual es mejor que el
anterior. **El estado correcto es publicar el `ads.txt` de Adsterra**: pídelo
en el panel (o a tu account manager: *"the ads.txt lines for my publisher
account"*), crea de nuevo `public/ads.txt` y pega el bloque **completo**, tal
cual. Suelen ser varias líneas, no una.

Verificar tras desplegar: `https://filmify.me/ads.txt` debe devolver texto
plano (el `matcher` del middleware ya excluye `.txt`).

## CSP: nada de scripts inline en el anuncio

El panel entrega el banner como dos `<script>`: uno inline con `atOptions` y
otro externo con `invoke.js`. **El inline no funciona en este sitio.** El
iframe hereda el CSP de la página, que usa nonce por petición, así que el
navegador rechaza cualquier inline sin él:

```
Refused to execute inline script because it violates the following
Content Security Policy directive: "script-src 'self' 'nonce-…' https:"
```

El fallo es silencioso: la página se ve bien y el hueco aparece, pero
`window.atOptions` nunca llega a existir y la red no recibe ni el formato ni
el tamaño de la zona.

Por eso `AdBanner` escribe `atOptions` directamente sobre el `contentWindow`
del iframe (es same-origin) y añade el script externo por DOM. Sin inline no
hay nada que bloquear, y `script-src https:` ya permite el script de la red.

**Al pegar código nuevo del panel, no lo copies tal cual**: quédate solo con
la URL de `invoke.js` y mete la clave en la variable de entorno.

## Puntos de corte

| Ancho | `auto` | `inline` | `player` |
|---|---|---|---|
| < 768px | 320x50 | 320x50 | 320x50 |
| 768–1023px | 300x250 | 300x250 | Native 4:1 |
| ≥ 1024px | 728x90 | 300x250 | Native 4:1 |

El 728x90 no entra por debajo de 1024px: necesita 728px **libres** y con los
márgenes de página se desborda por el lado derecho a 768px.

## Consentimiento

Los anuncios solo cargan con consentimiento de marketing. Desde agosto 2026 el
régimen depende de la región del visitante:

- **EEE, Reino Unido y Suiza** → consentimiento previo. Nada carga hasta que
  el visitante elija, y el aviso bloquea la página.
- **Resto del mundo** → modelo de exclusión: carga por defecto, con rechazo a
  un clic en el mismo aviso.

El país lo resuelve `src/middleware.ts` con la cabecera `cf-ipcountry`, que
**solo existe si el dominio está proxeado por Cloudflare** (nube naranja). Si
se pasa a "solo DNS", la cabecera desaparece, se asume el régimen estricto en
todo el mundo y las impresiones se desploman.

## Medición

`AdSlot` emite `ad_slot_view` (GA4 + Umami) cuando el hueco entra en pantalla,
con `ad_format` y `page_path`. El panel de Adsterra solo agrega por dominio,
así que este evento es la única forma de calcular el RPM por ruta y decidir
qué huecos sobran.
