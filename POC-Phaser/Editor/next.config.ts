import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.API_URL || 'http://127.0.0.1:3102'}/:path*`,
      },
    ];
  },
  experimental: { optimizePackageImports: ['antd'] },
};

export default nextConfig;
