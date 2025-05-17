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
  // Specify the domains for the site
  basePath: '',
  // Remove assetPrefix as it's causing CORS issues
  // assetPrefix: isProd ? 'https://handbok.org' : undefined,
  // Enable cross-origin properly
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
  // INAKTIVERAD - Orsakade sannolikt redirect-loopen
  /*
  async rewrites() {
    return {
      beforeFiles: [
        // Static assets should load from main domain  
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
        // Handle subdomains
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
  */
  // Set appropriate CORS headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
        ],
      },
      {
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
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
    ];
  },
};

export default nextConfig;
