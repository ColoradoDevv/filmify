# Construir un APK Android con Trusted Web Activity (TWA)

Filmify ya tiene los pasos iniciales para convertirse en una PWA instalable:
- `public/manifest.json`
- `public/sw.js`
- enlace al manifiesto y registro del Service Worker en `src/app/layout.tsx`

El siguiente paso es empaquetar la web como una app Android usando TWA. Esto crea un APK que abre tu sitio web en una ventana nativa, y mantiene la misma lógica y sincronización de datos que la web.

## Requisitos previos

1. Sitio web desplegado en HTTPS.
   - TWA necesita un dominio seguro. Ejemplo: `https://filmify.me`.
2. `manifest.json` válido y accesible desde ese dominio.
3. Iconos y `theme_color` configurados.
4. Android Studio instalado si vas a firmar y generar APK/Bundle.
5. Java JDK y Android SDK.

## Qué hace el APK

- Carga la misma web que ya tienes.
- Muestra la app en modo `standalone` sin barra del navegador.
- Permite que tu aplicación se distribuya como una app Android desde Google Play.
- Las actualizaciones se aplican desde la web hospedada; no necesitas enviar versión nueva del APK para contenido y UI que cambian en el sitio.

## Pasos para generar el APK

### 1) Verificar el PWA en producción

En tu dominio en HTTPS, abre la web en Chrome y comprueba en DevTools > Application:
- `Manifest` se carga sin errores.
- `Service worker` está registrado.
- El sitio ofrece la opción de instalarse.

### 2) Instalar Bubblewrap

Bubblewrap es la herramienta recomendada para crear TWA.

```bash
npm install -g @bubblewrap/cli
```

O usar con `npx`:

```bash
npx @bubblewrap/cli init --manifest=https://filmify.me/manifest.json
```

### 3) Inicializar el proyecto TWA

Desde un directorio vacío, ejecuta:

```bash
bubblewrap init --manifest=https://filmify.me/manifest.json
```

Bubblewrap descargará el manifest y creará un archivo `twa-manifest.json`.

### 4) Ajustar el TWA manifest

Revisa los valores generados y cambia lo necesario:
- `host`: el dominio de tu sitio.
- `name`, `shortName`, `startUrl`.
- `packageId`: un identificador único Android, por ejemplo `me.filmify.app`.
- `launcherName`.
- `navigationMode`: `default`.
- `signingKey`: usa una clave de firma propia para producción.

### 5) Generar el proyecto Android

```bash
bubblewrap build
```

Esto crea un proyecto Android basado en AndroidX.

### 6) Abrir en Android Studio

Abre el proyecto generado y construye un APK o AAB:
- `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- O `Build > Generate Signed Bundle / APK...`

Para publicar en Play Store, lo correcto es generar un `Android App Bundle (AAB)` firmado.

### 7) Firma y publicación

Usa la clave de firma de tu app.
- En Android Studio, crea o usa una `keystore` existente.
- Configura `release` con la firma.
- Genera `app-release.aab`.

Sube el artefacto a Google Play Console.

## Notas importantes para Filmify

- La PWA ya comparte backend y estado: la app Android usará la misma web y no duplicará datos.
- Si quieres mantener favoritos, listas y sesión, el backend web debe estar disponible para la app.
- El service worker actual es básico; para un TWA de producción conviene mejorar el cache si quieres mejor rendimiento offline.

## Mejora opcional: soporte Android TV

Filmify ya tiene modos TV en el código (`src/app/tv/page.tsx`, `tv-mode`, `TVLayoutWrapper`).

Para Android TV, necesitarás un proyecto Android especializado que cargue tu web en modo TV o un wrapper TV.

## Resumen

- Ya tienes lo necesario para un APK/TWA en la web.
- Ahora necesitas un dominio HTTPS y usar Bubblewrap para generar el proyecto Android.
- La app seguirá usando la misma lógica web y backend.

Si quieres, puedo ayudarte a crear el `twa-manifest.json` de ejemplo y una lista de archivos a preparar antes de ejecutar Bubblewrap.