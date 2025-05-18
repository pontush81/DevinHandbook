/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bildhantering
  images: {
    domains: ['handbok.org', 'www.handbok.org'],
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
  
  // Inga omskrivningar
  async rewrites() {
    return [];
  },
  
  // Redirects för dev-subdomäner i staging
  async redirects() {
    return [
      // För staging: test.dev.handbok.org -> dev.handbok.org/handbook/test
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'test.dev.handbok.org',
          },
        ],
        destination: 'https://dev.handbok.org/handbook/test',
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