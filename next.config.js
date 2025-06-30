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
  
  // Säkra headers med enkel CORS-hantering
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: process.env.NODE_ENV === 'development' 
              ? 'http://localhost:3000' 
              : 'https://www.handbok.org'
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Max-Age', value: '3600' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  
  poweredByHeader: false,
};

module.exports = nextConfig; 