import withSerwistInit from "@serwist/next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" || isCapacitorBuild,
});

/** @type {import('next').NextConfig} */

const nextConfig = {
  output: isCapacitorBuild ? 'export' : undefined,
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: isCapacitorBuild,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    optimizePackageImports: ['swr', 'clsx'],
  },
};

export default withSerwist(nextConfig);
