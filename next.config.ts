import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['kjsquvjzctdwgjypcjrg.supabase.co'],
    unoptimized: isProd, // För smidigare hantering av bilder i produktion
  },
  // Ensure that static assets are loaded from the main domain but allow localhost in dev
  assetPrefix: isProd ? 'https://handbok.org' : undefined,
  // Enable cross-origin
  crossOrigin: 'anonymous',
  // Använd även webpack för att konfigurera CrossOrigin för alla resurser
  webpack: (config) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Lägg till crossOrigin för alla resurser som laddas
    config.output = {
      ...config.output,
      crossOriginLoading: 'anonymous',
    };
    
    return config;
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Redirect _next requests to the main domain in production
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
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
