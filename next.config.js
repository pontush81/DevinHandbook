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
  
  // Skapar omskrivningar för subdomäner
  // async rewrites() {
  //   return [
  //     // Skriv om alla subdomäner till www.handbok.org/handbook/[subdomain]
  //     // MEN undanta API-anrop med regex (Next.js stödjer inte 'missing: path')
  //     {
  //       source: '/:path((?!api/).*)',
  //       has: [
  //         {
  //           type: 'host',
  //           value: ':subdomain.handbok.org',
  //         },
  //       ],
  //       destination: 'https://www.handbok.org/handbook/:subdomain/:path*',
  //     },
  //   ];
  // },
  
  // Redirects för subdomäner
  async redirects() {
    return [
      // Endast apex-domänen ska redirectas till www
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