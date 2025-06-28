// Load environment variables explicitly
require('dotenv').config({ path: '.env.local' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration to avoid webpack issues
  images: {
    domains: ['handbok.org', 'www.handbok.org', 'staging.handbok.org'],
    unoptimized: true,
  },
  
  // No custom webpack config to avoid module resolution issues
  
  // Basic config
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skapar omskrivningar för subdomäner
  async rewrites() {
    return [
      {
        source: '/((?!edit-handbook|dashboard|create-handbook|login|signup|auth|api).*)',
        has: [
          {
            type: 'host',
            value: '(?<subdomain>(?!www|staging|api)[a-zA-Z0-9-]+)\\.handbok\\.org',
          },
        ],
        destination: 'https://www.handbok.org/:subdomain/$1',
      },
    ];
  },
  
  // Redirects för subdomäner
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'handbok.org',
          },
        ],
        destination: 'https://www.handbok.org/:path*',
        permanent: true,
      },
    ];
  },
  
  // Basic headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        ],
      },
    ];
  },
  
  poweredByHeader: false,
};

module.exports = nextConfig; 