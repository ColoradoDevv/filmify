import type { NextConfig } from "next";

const nextConfig = {
  // Turbopack is the default bundler in Next.js 16.
  // An empty config silences the "webpack config without turbopack config" warning.
  turbopack: {},
  // SEO/security hygiene: don't advertise the framework in response headers.
  poweredByHeader: false,
  // SEC-025: re-enable ESLint during builds so security-relevant rules
  // (no-eval, no-implied-eval, etc.) can catch issues before deployment.
  // Remove this block entirely once all pre-existing lint warnings are resolved.
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  images: {
    // Loader propio: pide a TMDB el tamaño exacto que se muestra (resize +
    // srcset responsive), sin usar el optimizador de Vercel (cero coste de
    // transformaciones). Ver src/lib/tmdbImageLoader.ts.
    loader: 'custom',
    loaderFile: './src/lib/tmdbImageLoader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'cyiifumieluunoujaxbs.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // Portadas/banners de anime servidos por AniList (apartado /anime).
        protocol: 'https',
        hostname: 's4.anilist.co',
        pathname: '/file/**',
      },
    ],
    // Anchos que Next usará para generar el srcset (coinciden con los tamaños
    // de TMDB para que el loader mapee 1:1 sin redondeos hacia arriba).
    deviceSizes: [185, 342, 500, 780, 1280],
    imageSizes: [92, 154, 300],
    minimumCacheTTL: 60,
  },
  async rewrites() {
    return [
      {
        source: '/portal.php',
        destination: '/api/portal',
      },
    ];

  },
  async redirects() {
    // Slugs del lote editorial anterior (eliminado el 2026-06-12). Los 301
    // preservan la autoridad de las URLs ya indexadas y evitan una ola de
    // 404 en Search Console. Los que tienen sucesor directo apuntan a él;
    // el resto, a la portada del editorial.
    const gone = (source: string, destination = '/editorial') => ({
      source: `/editorial/${source}`,
      destination,
      permanent: true,
    });
    // Módulo de doramas cerrado — ver `isDoramasEnabled` en src/lib/env.ts.
    // Va aquí y no en middleware.ts porque ese archivo NO se está cargando
    // (Next lo busca junto a `app/`, es decir en src/, y está en la raíz):
    // los redirects de next.config sí se aplican siempre. Se evalúa en build,
    // así que cambiar NEXT_PUBLIC_DORAMAS_ENABLED exige recompilar — que es
    // justo lo que hace el deploy.
    const doramasEnabled = process.env.NEXT_PUBLIC_DORAMAS_ENABLED === '1'
      || process.env.NEXT_PUBLIC_DORAMAS_ENABLED === 'true'
      || (process.env.NEXT_PUBLIC_DORAMAS_ENABLED !== '0'
        && process.env.NEXT_PUBLIC_DORAMAS_ENABLED !== 'false'
        && process.env.NODE_ENV !== 'production');

    const doramasClosed = doramasEnabled
      ? []
      : [
        // Temporal (307): la sección vuelve cuando haya proveedor.
        { source: '/doramas', destination: '/browse?category=tv', permanent: false },
        { source: '/doramas/:path*', destination: '/browse?category=tv', permanent: false },
      ];

    return [
      ...doramasClosed,
      // BD antigua → sucesores directos
      gone('avengers-doomsday-todo-lo-que-sabemos', '/editorial/avengers-doomsday-rdj-doctor-doom-diciembre'),
      gone('toy-story-5-fecha-estreno-2026', '/editorial/toy-story-5-estreno-19-junio-woody-buzz'),
      gone('donde-ver-peliculas-online-gratis-2026', '/editorial/donde-ver-peliculas-online-gratis-legal-2026'),
      gone('mandalorian-grogu-pelicula-2026'),
      gone('sinners-ryan-coogler-pelicula-2026'),
      gone('mejores-estrenos-streaming-mayo-2026'),
      gone('peliculas-oscar-2025'),
      gone('como-elegir-pelicula-para-ver'),
      gone('mejores-series-netflix-2025'),
      gone('guia-streaming-mexico-2025'),
      // Mocks antiguos (estaban enlazados desde las páginas de categoría)
      gone('vengadores-doomsday-primer-trailer', '/editorial/avengers-doomsday-rdj-doctor-doom-diciembre'),
      gone('shrek-5-fecha-estreno-reparto'),
      gone('mejor-cine-terror-2026', '/editorial/el-terror-domina-2026-backrooms-fenomeno'),
      gone('mandalorian-y-grogu-detalles-trama'),
      gone('toy-story-5-primeras-imagenes', '/editorial/toy-story-5-estreno-19-junio-woody-buzz'),
      gone('la-casa-del-dragon-temporada-3-teaser', '/editorial/la-casa-del-dragon-temporada-3-batalla-gaznate'),
      gone('the-last-of-us-t2-episodio-1-analisis'),
      gone('one-piece-netflix-t2-casting-chopper'),
      gone('el-oso-temporada-4-fecha-confirmada', '/editorial/the-bear-temporada-5-final-carmy'),
      gone('mejores-series-netflix-mayo-2026'),
      gone('disney-plus-hulu-fusion-precios-2026', '/editorial/netflix-compra-warner-bros-hbo-max-que-significa'),
      gone('max-vs-netflix-quien-gana-2026', '/editorial/netflix-compra-warner-bros-hbo-max-que-significa'),
      gone('amazon-prime-video-nuevas-funciones-ia'),
      gone('apple-tv-plus-acuerdo-deportes-vivo'),
      gone('streaming-gratis-plataformas-fast-2026', '/editorial/donde-ver-peliculas-online-gratis-legal-2026'),
    ];
  },
  async headers() {
    return [
      {
        source: '/api/proxy/latino',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
      // NOTE: Content-Security-Policy is set per-request in middleware.ts
      // with a unique nonce. Do NOT add a static CSP here — it would override
      // the nonce-based policy and break Next.js inline scripts.
    ];
  },
} satisfies NextConfig & { eslint?: { ignoreDuringBuilds?: boolean } };

export default nextConfig;
