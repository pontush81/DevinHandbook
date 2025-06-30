import { NextRequest, NextResponse } from 'next/server';
import { getHandbookBySlug } from '@/lib/handbook-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    // Base manifest for the main site
    const baseManifest = {
      "name": "Handbok - Digital Personalhandbok",
      "short_name": "Handbok",
      "description": "Din digitala personalhandbok - alltid tillgänglig på din enhet",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#2563eb",
      "orientation": "portrait-primary",
      "scope": "/",
      "lang": "sv",
      "icons": [
        {
          "src": "/icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "maskable any"
        },
        {
          "src": "/icon-512x512.png",
          "sizes": "512x512", 
          "type": "image/png",
          "purpose": "maskable any"
        },
        {
          "src": "/apple-touch-icon.png",
          "sizes": "180x180",
          "type": "image/png"
        }
      ],
      "categories": ["business", "productivity", "reference"],
      "prefer_related_applications": false
    };

    // If no slug provided, return base manifest
    if (!slug) {
      return NextResponse.json(baseManifest, {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    }

    // Get handbook data for custom manifest
    console.log(`[Manifest API] Generating manifest for handbook: ${slug}`);
    const handbookData = await getHandbookBySlug(slug);

    if (!handbookData) {
      console.log(`[Manifest API] No handbook found for slug: ${slug}, returning base manifest`);
      return NextResponse.json(baseManifest, {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes for failed lookups
        }
      });
    }

    // Create handbook-specific manifest
    const handbookManifest = {
      ...baseManifest,
      "name": `${handbookData.title} - Handbok`,
      "short_name": handbookData.title.length > 12 ? 
        handbookData.title.substring(0, 12) : 
        handbookData.title,
      "description": `${handbookData.title} - Din digitala handbok, alltid tillgänglig offline`,
      "start_url": `/${slug}`,
      "scope": `/${slug}/`,
      "shortcuts": [
        {
          "name": "Visa handbok",
          "short_name": "Handbok",
          "description": `Öppna ${handbookData.title}`,
          "url": `/${slug}`,
          "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
        },
        ...(handbookData.forum_enabled ? [{
          "name": "Meddelanden",
          "short_name": "Meddelanden",
          "description": "Öppna forum och meddelanden",
          "url": `/${slug}/meddelanden`,
          "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
        }] : []),
        {
          "name": "Medlemmar",
          "short_name": "Medlemmar",
          "description": "Hantera medlemmar",
          "url": `/${slug}/members`,
          "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
        }
      ]
    };

    console.log(`[Manifest API] Generated custom manifest for: ${handbookData.title}`);
    
    return NextResponse.json(handbookManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('[Manifest API] Error generating manifest:', error);
    
    // Return base manifest as fallback
    const baseManifest = {
      "name": "Handbok - Digital Personalhandbok",
      "short_name": "Handbok",
      "description": "Din digitala personalhandbok - alltid tillgänglig på din enhet",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#2563eb",
      "orientation": "portrait-primary",
      "scope": "/",
      "lang": "sv",
      "icons": [
        {
          "src": "/icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "maskable any"
        },
        {
          "src": "/icon-512x512.png",
          "sizes": "512x512", 
          "type": "image/png",
          "purpose": "maskable any"
        },
        {
          "src": "/apple-touch-icon.png",
          "sizes": "180x180",
          "type": "image/png"
        }
      ],
      "categories": ["business", "productivity", "reference"],
      "prefer_related_applications": false
    };

    return NextResponse.json(baseManifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
} 