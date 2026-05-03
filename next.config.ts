import type { NextConfig } from "next";

const nextConfig = {
  // Turbopack is the default bundler in Next.js 16.
  // An empty config silences the "webpack config without turbopack config" warning.
  turbopack: {},
  // SEC-025: re-enable ESLint during builds so security-relevant rules
  // (no-eval, no-implied-eval, etc.) can catch issues before deployment.
  // Remove this block entirely once all pre-existing lint warnings are resolved.
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  images: {
    unoptimized: true, // Deshabilita optimización para evitar límites de Vercel
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
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    qualities: [75, 95, 100],
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
