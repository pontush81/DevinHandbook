/** @type {import('next').NextConfig} */
const nextConfig = {
  // Konfigurera domänhantering för subdomäner
  async rewrites() {
    return {
      beforeFiles: [
        // CSS-resurser
        {
          source: '/_next/static/css/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/_next/static/css/:path*',
        },
        // JS chunks
        {
          source: '/_next/static/chunks/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/_next/static/chunks/:path*',
        },
        // JS filer
        {
          source: '/_next/static/:path*.js',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/_next/static/:path*.js',
        },
        // Media filer
        {
          source: '/_next/static/media/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/_next/static/media/:path*',
        },
        // Font filer
        {
          source: '/:path*.woff2',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/:path*.woff2',
        },
        // Statiska resurser
        {
          source: '/static/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/static/:path*',
        },
        // Hantera subdomän-routing för besökare
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: '/create-handbook',
        },
        // API-anrop
        {
          source: '/api/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: '/api/:path*', 
        },
      ],
    };
  },
  
  // Konfigurera headers för säkerhet och CORS
  async headers() {
    return [
      // För alla Next.js-genererade resurser
      {
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, stale-while-revalidate=86400' }
        ],
      },
      // Speciellt för API-routes
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Proxy-Count, X-Requested-With, X-Client-Info, apikey' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' }
        ],
      },
      // För CSS-filer specifikt
      {
        source: '/_next/static/css/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/css; charset=UTF-8' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }
        ],
      },
      // För JavaScript-filer
      {
        source: '/_next/static/:path*.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ],
      },
      // För JavaScript chunks
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ],
      },
      // För font-filer
      {
        source: '/_next/static/media/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }
        ],
      },
      // För woff2 font-filer
      {
        source: '/:path*.woff2',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'font/woff2' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }
        ],
      },
      // För storage-bridge
      {
        source: '/(auth-bridge|storage-bridge).html',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
        ],
      },
      // För JS hjälpskript
      {
        source: '/(cross-domain-storage|static-resource-fix).js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' }
        ],
      },
    ];
  },
  
  // Bildhantering och domänkonfiguration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: '**.handbok.org',
      },
    ],
    domains: ['handbok.org', 'www.handbok.org'],
    unoptimized: process.env.NODE_ENV === 'production',
  },
  
  // Kompilering och byggkonfiguration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Komprimering
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig; 