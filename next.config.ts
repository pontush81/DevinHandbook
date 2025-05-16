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
  // Ensure that static assets are loaded from the main domain
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://handbok.org' : undefined,
  // Enable cross-origin
  crossOrigin: 'anonymous',
  async rewrites() {
    return {
      beforeFiles: [
        // Redirect _next requests to the main domain
        {
          source: '/_next/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+)\\.handbok\\.org',
            },
          ],
          destination: 'https://handbok.org/_next/:path*',
        },
        // Normal page routing for subdomains
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
  // Set appropriate CORS headers
  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        ],
      },
    ];
  },
};

export default nextConfig;
