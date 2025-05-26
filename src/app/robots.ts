import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/handbook-settings/',
        '/reset-password/',
        '/auth/',
        '/_next/',
        '/static/',
      ],
    },
    sitemap: 'https://handbok.org/sitemap.xml',
  }
} 