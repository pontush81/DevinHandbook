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
  
  // Inga omskrivningar
  async rewrites() {
    return [];
  },
  
  // Redirects för test.staging.handbok.org
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