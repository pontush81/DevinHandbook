import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Ensure URL has a protocol, default to https://
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Basic security check - only allow http/https
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    try {
      // Fetch the page to extract metadata
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Handbok.org Link Preview Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({
          success: 1,
          meta: {
            title: validUrl.hostname,
            description: `Länk till ${validUrl.hostname}`,
            image: {
              url: ''
            }
          }
        });
      }

      const html = await response.text();
      
      // Extract basic metadata from HTML
      const title = extractTitle(html) || validUrl.hostname;
      const description = extractDescription(html) || `Länk till ${validUrl.hostname}`;
      const image = extractImage(html, validUrl.origin);

      return NextResponse.json({
        success: 1,
        meta: {
          title: title.substring(0, 100), // Limit title length
          description: description.substring(0, 200), // Limit description length
          image: {
            url: image || ''
          }
        }
      });

    } catch (error) {
      // If fetch fails, return basic metadata
      return NextResponse.json({
        success: 1,
        meta: {
          title: validUrl.hostname,
          description: `Länk till ${validUrl.hostname}`,
          image: {
            url: ''
          }
        }
      });
    }

  } catch (error) {
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractTitle(html: string): string | null {
  // Try to extract title from various sources
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();

  const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (ogTitleMatch) return ogTitleMatch[1].trim();

  const twitterTitleMatch = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i);
  if (twitterTitleMatch) return twitterTitleMatch[1].trim();

  return null;
}

function extractDescription(html: string): string | null {
  // Try to extract description from various sources
  const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
  if (ogDescMatch) return ogDescMatch[1].trim();

  const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
  if (metaDescMatch) return metaDescMatch[1].trim();

  const twitterDescMatch = html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]+)"/i);
  if (twitterDescMatch) return twitterDescMatch[1].trim();

  return null;
}

function extractImage(html: string, origin: string): string | null {
  // Try to extract image from various sources
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
  if (ogImageMatch) {
    const imageUrl = ogImageMatch[1].trim();
    return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, origin).toString();
  }

  const twitterImageMatch = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i);
  if (twitterImageMatch) {
    const imageUrl = twitterImageMatch[1].trim();
    return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, origin).toString();
  }

  return null;
} 