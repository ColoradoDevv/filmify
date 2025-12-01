import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
  },
  experimental: {
    turbo: {
      resolveAlias: {
        // Workaround for source map issues in Turbopack
      },
    },
  },
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = false; // Disable source maps in development
      config.ignoreWarnings = [
        { module: /node_modules/ },
      ];
    }
    return config;
  },
};

export default nextConfig;
