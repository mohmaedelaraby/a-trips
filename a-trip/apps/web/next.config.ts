import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone with only the traced runtime files, so the Docker
  // image does not need node_modules or the pnpm store.
  output: 'standalone',
  // Without this, tracing starts at apps/web and misses the hoisted workspace
  // dependencies at the monorepo root.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
