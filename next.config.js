/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bildhantering
  images: {
    domains: ['handbok.org', 'www.handbok.org', 'staging.handbok.org'],
    unoptimized: true,
  },
  
  // Webpack configuration for better stability and development experience
  webpack: (config, { dev, isServer }) => {
    // Improve module resolution stability
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // Fix for EditorJS and other client-side libraries
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure consistent module resolution
        '@editorjs/editorjs': require.resolve('@editorjs/editorjs'),
      };
    }
    
      // Optimize for development
  if (dev) {
    // Reduce webpack noise and improve error reporting
    config.stats = 'errors-warnings';
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // Fast Refresh optimizations
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
    };
    
    // Reduce build time in development
    config.optimization = {
      ...config.optimization,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    };
  }
    
    return config;
  },
  
  // Experimental features with careful selection
  experimental: {
    // Clean experimental config
  },
  
  // Turbopack configuration (stable) - only in development
  ...(process.env.NODE_ENV === 'development' && {
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    }
  }),
  
  // Dev optimization
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Basic config för att undvika konflikter
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  
  // Kompilering och byggkonfiguration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skapar omskrivningar för subdomäner
  async rewrites() {
    return [
      // Direkt routing för subdomäner utan /handbook/ prefix
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