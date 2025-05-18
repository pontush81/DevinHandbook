/** @type {import('next').NextConfig} */
const nextConfig = {
  // Konfigurera domänhantering för subdomäner
  async rewrites() {
    return {
      beforeFiles: [
        // CSS-resurser måste hanteras direkt för att undvika CORS-problem
        {
          source: '/_next/static/css/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            },
            // Prevents redirect loops - only redirect if NOT already from handbok.org
            {
              type: 'header',
              key: 'referer',
              value: '(?!.*handbok\\.org).*',
            }
          ],
          destination: 'https://handbok.org/_next/static/css/:path*',
        },
        // Hantera JS-filer direkt
        {
          source: '/_next/static/chunks/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            },
            // Prevents redirect loops
            {
              type: 'header',
              key: 'referer',
              value: '(?!.*handbok\\.org).*',
            }
          ],
          destination: 'https://handbok.org/_next/static/chunks/:path*',
        },
        // Hantera media-filer (font, etc) direkt
        {
          source: '/_next/static/media/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            },
            // Prevents redirect loops
            {
              type: 'header',
              key: 'referer',
              value: '(?!.*handbok\\.org).*',
            }
          ],
          destination: 'https://handbok.org/_next/static/media/:path*',
        },
        // Proxy endpoint for fonts with wildcards to handle any hash in filename
        {
          source: '/:path*.woff2',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/:path.woff2',
        },
        // Hantera andra statiska resurser
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
        // API proxy for resource loading
        {
          source: '/api/resources/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: 'https://handbok.org/api/resources/:path*',
        },
        // Hantera subdomän-routing utan middleware för besökare
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+).handbok.org',
            }
          ],
          destination: '/create-handbook',  // Dirigera till femstegsguiden
        },
        // API-anrop passerar vidare normalt
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
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Proxy-Count' },
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
      // För JavaScript-filer specifikt
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }
        ],
      },
      // För font-filer - explicit content-type
      {
        source: '/_next/static/media/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }
        ],
      },
      // För alla woff2 font-filer med mera exakta content-type headers
      {
        source: '/:path*.woff2',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'font/woff2' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }
        ],
      },
      // För statiska sidor och hjälpfiler
      {
        source: '/static-:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=86400' }
        ],
      },
      // För auth-bridge och storage-bridge
      {
        source: '/(auth-bridge|storage-bridge).html',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
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
    unoptimized: process.env.NODE_ENV === 'production', // För bättre hantering i produktion
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