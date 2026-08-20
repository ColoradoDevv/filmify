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
<AdSlot variant="player" />     {/* bajo el reproductor — hoy igual que inline */}
```

### ⚠️ El Native Banner está DESACTIVADO

`variant="player"` cae al rectángulo 300x250 porque `nativeSrc` está vacío a
propósito. **No rellenes esa variable sin leer esto.**

**Qué pasó.** En junio de 2026 el sitio quedó inservible en móvil: el primer
toque en cualquier parte de la página redirigía a una página de anuncios. El
componente que lo provocaba era `AdBanner1`, que servía este mismo Native
Banner (mismo script `pl29700108.effectivecpmnetwork.com/88c8fb19…`, mismo
`container-88c8fb19…`). Se comentó entero el 13/06/2026 y se borró el 16/06.

**Por qué el 728x90 nunca dio ese problema.** Corre dentro de un
`<iframe sandbox="allow-scripts allow-same-origin">`. Un sandbox sin
`allow-top-navigation` ni `allow-popups` no puede navegar la ventana principal
ni abrir pop-ups, haga lo que haga el creativo. El Native Banner, en cambio,
se inyecta en el documento principal — es el formato el que exige estar en la
página para heredar tipografía y colores — y ahí tiene privilegios completos.

La cronología descarta al Social Bar: el 13/06, cuando se apagó el nativo, el
Social Bar todavía no existía en el repo (llegó el 15/06, y también acabó
retirado). El único script publicitario suelto en la página era el nativo.

**Cómo reactivarlo bien.** No basta con poner las variables. Hay que servir el
anuncio desde una ruta propia same-origin (p. ej. `/ads/frame?zone=…`) que
devuelva el HTML del anuncio con su `atOptions` inline **nonceado**, y montar
esa ruta en un `<iframe sandbox="allow-scripts">` **sin** `allow-same-origin`:
con origen opaco el creativo no alcanza el DOM del padre, no puede navegar la
página ni abrir pop-ups. Se pierde la herencia de tipografía del widget (se
puede imitar copiando la fuente y los colores dentro del iframe) y hay que
ajustar la altura leyendo el contenido, pero el formato deja de ser un riesgo.

Mismo razonamiento para el **Social Bar**: es un overlay a página completa por
diseño, así que no se puede aislar en un iframe. Antes de volver a montarlo
hay que probarlo en un móvil real y estar dispuesto a quitarlo rápido.

El layout del widget se cambia desde el panel (**GET CODE → Widget layout →
SAVE**) sin tocar código: la URL del script y el id del contenedor no cambian.

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

**El sitio NO sirve `ads.txt`, y ese es el estado correcto.**

Antes existía `public/ads.txt` con una única línea de `google.com`: autorizaba
a AdSense, que nunca llegó a servir un anuncio, y no mencionaba a Adsterra,
que es quien sí vende el inventario. Se borró junto con AdSense.

Adsterra **no entrega líneas de `ads.txt`** para las cuentas de publisher.
Confirmado con su soporte (agosto 2026): *"We don't provide ads.txt lines for
publisher accounts. Our advertisers don't require an ads.txt file, so there
are no official lines to add."* Su demanda no pasa por exchanges que verifiquen
el archivo, así que no influye en el CPM. **No inventes líneas**: autorizar a
vendedores a ojo no aporta nada y puede describir mal quién puede vender tu
inventario.

Cuándo volvería a hacer falta: si algún día se añade una segunda red o se
monta AdSense/Ezoic en un dominio limpio. Esas redes sí exigen `ads.txt` y sí
entregan sus líneas — entonces se crea `public/ads.txt` con las que den ellas.

## Aislamiento del creativo

Cada banner se sirve desde `/ads/frame?zone=…` (`src/app/ads/frame/route.ts`)
dentro de un iframe con:

```
sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
```

**Sin `allow-same-origin`**, que es lo que importa: el documento del anuncio
queda en un origen opaco y no puede leer ni escribir el DOM de la página, ni
navegar la pestaña, ni registrar listeners sobre nuestro documento.

El montaje anterior escribía el anuncio con `document.write` en un iframe
`allow-scripts allow-same-origin`. Bloqueaba la navegación y los pop-ups, pero
al compartir origen el creativo **sí** llegaba al documento de la página —
verificado con un creativo hostil de prueba, que consiguió escribir en el
`<body>` del padre y registrar un listener de click. Desde ahí basta con
inyectar un `<script>` en el padre para escapar del sandbox por completo. Es
la misma clase de fallo que dejó el sitio inservible en móvil en junio de 2026.

`allow-popups` está puesto a propósito: es lo que permite que un clic legítimo
abra la página del anunciante en una pestaña nueva. Sin él, los clics no
llevaban a ninguna parte — la red los contaba, el anunciante no recibía la
visita, y el eCPM de la zona se hunde. El riesgo que añade es acotado: con el
bloqueador de pop-ups normal del navegador, un creativo que intente abrir uno
**sin gesto del usuario** obtiene cero (verificado en `scripts/ads/audit.mjs`).

La zona se pide por NOMBRE (`leaderboard` / `rectangle` / `mobile`), nunca por
clave ni por URL, y la clave se valida contra `/^[a-f0-9]{16,64}$/` antes de
entrar en el HTML: ningún parámetro externo puede acabar cargando un script de
terceros arbitrario.

## Auditoría automática

```bash
npm i -D playwright
npm run dev                          # terminal 1
node scripts/ads/mock-network.mjs    # terminal 2
node scripts/ads/audit.mjs           # terminal 3
```

Recorre trece anchos de pantalla comprobando que ningún anuncio se desborda ni
queda tapado por la UI flotante, que un creativo sobredimensionado (1600x800
en un hueco de 320x50) se recorta sin sacar scroll horizontal, y que un
creativo hostil no puede tocar la página. Sale con código 1 si algo falla.

`mock-network.mjs` simula la red en tres modos (`normal`, `oversize`,
`hostile`) para no depender de qué creativo sirva Adsterra ese día.

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

Por eso el anuncio se sirve desde `/ads/frame`, una ruta nuestra: ahí sí
podemos firmar el `atOptions` inline con el nonce de la petición. `frame-src`
incluye `'self'` para poder montar esa ruta en un iframe.

**Al pegar código nuevo del panel, no lo copies tal cual**: quédate solo con
la URL de `invoke.js` y mete la clave en la variable de entorno.

## Puntos de corte

`AdSlot` mide el **contenedor**, no la ventana, y sirve el formato más grande
que quepa:

| Ancho disponible | `auto` | `inline` / `player` |
|---|---|---|
| < 320px | nada | nada |
| 320–639px | 320x50 | 320x50 |
| 640–727px | 300x250 | 300x250 |
| ≥ 728px | 728x90 | 300x250 |

Medir la ventana no vale: el sidebar se come 224px a partir de 1024px y cada
página añade su `max-w` y sus paddings. En la ficha de película, a 1024px de
ventana solo quedan ~672px libres — un 728x90 elegido por media query se salía
del contenedor.

(`player` serviría el Native Banner 4:1 si estuviera activo — ver arriba por
qué no lo está.)

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
