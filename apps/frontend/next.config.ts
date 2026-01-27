import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
