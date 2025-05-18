import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

// Lägg till stöd för domäner och subdomäner
const validDomains = [
  'handbok.org',
  'www.handbok.org',
  'test.handbok.org',
  'hej.handbok.org',
  'hej1.handbok.org',
  'devin-handbook.vercel.app'
];

// Lägg till Supabase-domänen för korrekt CORS-hantering
const getSupabaseDomain = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  try {
    if (supabaseUrl) {
      const url = new URL(supabaseUrl);
      return url.hostname;
    }
  } catch (e) {
    console.warn('Kunde inte parsa Supabase URL:', supabaseUrl);
  }
  return null;
};

const supabaseDomain = getSupabaseDomain();
const imageDomains = ['kjsquvjzctdwgjypcjrg.supabase.co', ...validDomains];

// Lägg till Supabase-domänen till images.domains om den finns
if (supabaseDomain && !imageDomains.includes(supabaseDomain)) {
  imageDomains.push(supabaseDomain);
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: imageDomains,
    unoptimized: isProd, // För smidigare hantering av bilder i produktion
  },
  // Återlägg nödvändiga Cross-Origin konfigurationer
  async headers() {
    return [
      {
        // För alla sökvägar
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, X-Client-Info, apikey' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // Särskilt för API endpoints
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, X-Client-Info, apikey' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // För Next.js statiska resurser
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Timing-Allow-Origin', value: '*' },
        ],
      },
      {
        // För CSS-filer specifikt
        source: '/_next/static/css/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'text/css; charset=UTF-8' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Timing-Allow-Origin', value: '*' },
        ],
      },
      {
        // För JavaScript-filer specifikt
        source: '/_next/static/chunks/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Timing-Allow-Origin', value: '*' },
        ],
      },
      {
        // För statiska resurser i public-mappen
        source: '/static/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Timing-Allow-Origin', value: '*' },
        ],
      },
      {
        // För fontfiler (woff2, etc)
        source: '/_next/static/media/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Timing-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
