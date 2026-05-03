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
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // SEC-013: 'unsafe-inline' in script-src completely neutralises XSS
            // protection. Removed it. Inline scripts that are genuinely needed
            // should use a nonce (see middleware.ts) or be moved to external files.
            // 'unsafe-inline' is kept only for style-src because CSS-in-JS
            // libraries require it and CSS injection is lower-risk than JS.
            value: `
              default-src 'self';
              script-src 'self' https:;
              style-src 'self' 'unsafe-inline' https:;
              img-src 'self' data: blob https:;
              media-src 'self' blob https:;
              connect-src 'self' https: wss:;
              font-src 'self' data: https:;
              frame-src https:;
              frame-ancestors 'self';
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
} satisfies NextConfig & { eslint?: { ignoreDuringBuilds?: boolean } };

export default nextConfig;
