/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bildhantering
  images: {
    domains: ['handbok.org', 'www.handbok.org', 'staging.handbok.org'],
    unoptimized: true,
  },
  
  // Absolut minimal config för att undvika konflikter
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  
  // Avaktivera webpack-optimeringar i produktion för att undvika problem
  productionBrowserSourceMaps: false,
  
  // Kompilering och byggkonfiguration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skapa faktiska omskrivningar för test-subdomän
  async rewrites() {
    return [
      // Skriv om trafik från test.handbok.org -> www.handbok.org/handbook/test
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'test.handbok.org',
          },
        ],
        destination: 'https://www.handbok.org/handbook/test/:path*',
      },
    ];
  },
  
  // Redirects för subdomäner
  async redirects() {
    return [
      // För test.staging.handbok.org -> staging.handbok.org/handbook/test
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'test.staging.handbok.org',
          },
        ],
        destination: 'https://staging.handbok.org/handbook/test/:path*',
        permanent: false,
      },
      
      // Hantera test.{subdomain}.handbok.org -> www.handbok.org/handbook/{subdomain}
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'test.{subdomain}.handbok.org',
          },
        ],
        destination: 'https://www.handbok.org/handbook/:subdomain/:path*',
        permanent: false,
      },
      
      // Grundläggande handbok.org -> www.handbok.org
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'handbok.org',
          }
        ],
        destination: 'https://www.handbok.org/:path*',
        permanent: false,
      }
    ];
  },
  
  // Enkla headers för alla filer
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=3600' }
        ],
      }
    ];
  },
  
  // Komprimering
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig; 