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
