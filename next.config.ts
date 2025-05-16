import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['kjsquvjzctdwgjypcjrg.supabase.co'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+)\\.handbok\\.org',
            },
          ],
          destination: '/handbook/:subdomain/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
