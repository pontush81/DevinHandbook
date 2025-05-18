import { NextRequest, NextResponse } from 'next/server';

/**
 * This API route serves as a proxy for fetching static resources across subdomains
 * to avoid CORS and redirect issues when accessing resources like CSS, JS, and fonts.
 * 
 * Version: 3.0
 */

// Map of minimal fallbacks for critical resource types
const FALLBACKS = {
  css: `
    /* Emergency fallback CSS */
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.5;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3 { color: #222; margin-top: 1.5em; margin-bottom: 0.75em; }
    p { margin-bottom: 1em; }
    a { color: #4a56e2; text-decoration: none; }
    a:hover { text-decoration: underline; }
    button, .btn { 
      background: #4a56e2; color: white;
      padding: 0.5rem 1rem; border: none;
      border-radius: 0.25rem; cursor: pointer;
    }
    input, select, textarea {
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 0.25rem;
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 1rem;
    }
    .container, main, section {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }
  `,
  js: `console.warn("Fallback script loaded - original resource unavailable");`,
  font: new Uint8Array([0]), // Empty font file
};

// Resource type cache duration mapping
const CACHE_DURATIONS = {
  css: 86400,    // CSS files: 1 day
  js: 86400,     // JS files: 1 day
  font: 2592000, // Font files: 30 days
  image: 604800, // Images: 7 days
  other: 3600    // Other: 1 hour
};

// Helper to get content type based on path
function getContentType(path: string): string {
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.ttf')) return 'font/ttf';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.json')) return 'application/json';
  
  // Default content type
  return 'application/octet-stream';
}

// Helper to get resource type category
function getResourceType(path: string): 'css' | 'js' | 'font' | 'image' | 'other' {
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.js')) return 'js';
  if (path.match(/\.(woff2?|ttf|otf|eot)$/i)) return 'font';
  if (path.match(/\.(png|jpe?g|gif|svg|webp|ico)$/i)) return 'image';
  return 'other';
}

// Helper to get cache duration based on resource type
function getCacheDuration(path: string): number {
  const resourceType = getResourceType(path);
  return CACHE_DURATIONS[resourceType] || CACHE_DURATIONS.other;
}

// Helper to create a fallback response
function createFallbackResponse(path: string): NextResponse {
  const resourceType = getResourceType(path);
  const contentType = getContentType(path);
  
  // Get appropriate fallback content
  const fallbackContent = FALLBACKS[resourceType] || null;
  
  if (!fallbackContent) {
    return NextResponse.json(
      { error: 'Resource not available and no fallback exists for this type' },
      { status: 404 }
    );
  }
  
  console.log(`Serving fallback for ${resourceType} resource: ${path}`);
  
  return new NextResponse(fallbackContent, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Resource-Fallback': 'true'
    }
  });
}

// Cache for previously requested resources to improve performance
const resourceCache = new Map<string, {data: ArrayBuffer, type: string, time: number}>();
const CACHE_SIZE_LIMIT = 50; // Maximum number of items to keep in memory cache
const CACHE_TTL = 300000; // 5 minutes cache TTL for memory cache

// Helper to clean up old cache entries
function cleanupCache() {
  const now = Date.now();
  let itemsToRemove = [];
  
  // Identify old items
  for (const [key, value] of resourceCache.entries()) {
    if (now - value.time > CACHE_TTL) {
      itemsToRemove.push(key);
    }
  }
  
  // Remove old items
  for (const key of itemsToRemove) {
    resourceCache.delete(key);
  }
  
  // If still too many items, remove oldest ones
  if (resourceCache.size > CACHE_SIZE_LIMIT) {
    const sortedEntries = Array.from(resourceCache.entries())
      .sort((a, b) => a[1].time - b[1].time);
    
    const excessCount = resourceCache.size - CACHE_SIZE_LIMIT;
    for (let i = 0; i < excessCount; i++) {
      resourceCache.delete(sortedEntries[i][0]);
    }
  }
}

/**
 * GET handler for resource proxy
 */
export async function GET(req: NextRequest) {
  // Get the resource path from the query string
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  
  if (!path) {
    return NextResponse.json(
      { error: 'Path parameter is required' },
      { status: 400 }
    );
  }
  
  // Check cache first (before tracking proxy count)
  const cacheKey = path;
  if (resourceCache.has(cacheKey)) {
    const cached = resourceCache.get(cacheKey);
    
    // Update access time
    if (cached) {
      cached.time = Date.now();
      
      return new NextResponse(cached.data, {
        status: 200,
        headers: {
          'Content-Type': cached.type,
          'Cache-Control': `public, max-age=${getCacheDuration(path)}`,
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Resource-Cache': 'hit'
        },
      });
    }
  }
  
  // Track proxy requests to detect loops
  const proxyCount = parseInt(req.headers.get('x-proxy-count') || '0');
  if (proxyCount > 3) {
    console.error(`Too many proxy redirects detected for: ${path}`);
    
    // Return fallback content based on resource type
    return createFallbackResponse(path);
  }
  
  // Determine the root domain for fetching resources
  const resourceDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'handbok.org';
  
  try {
    // Construct the full URL to fetch
    let resourceUrl = path.startsWith('https://') || path.startsWith('http://') 
      ? path 
      : `https://${resourceDomain}${path.startsWith('/') ? path : `/${path}`}`;
    
    // Always use HTTPS
    resourceUrl = resourceUrl.replace('http://', 'https://');
    
    console.log(`Proxying resource: ${resourceUrl}`);
    
    // Fetch the resource with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': 'Handbok-Resource-Proxy/3.0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'x-proxy-count': (proxyCount + 1).toString(),
      },
      signal: controller.signal,
      next: { revalidate: getCacheDuration(path) } // Use appropriate cache duration
    }).finally(() => {
      clearTimeout(timeoutId);
    });
    
    if (!response.ok) {
      console.error(`Error fetching resource: ${response.status} ${response.statusText} for ${resourceUrl}`);
      
      // Provide fallback content for important resource types
      return createFallbackResponse(path);
    }
    
    // Get the content type from the response or infer it from the path
    let contentType = response.headers.get('content-type');
    if (!contentType) {
      contentType = getContentType(path);
    }
    
    // Get the response body as an array buffer for binary data support
    const arrayBuffer = await response.arrayBuffer();
    
    // Cache the response in memory (only if it's not too large)
    if (arrayBuffer.byteLength < 1024 * 1024) { // Don't cache items larger than 1MB
      resourceCache.set(cacheKey, {
        data: arrayBuffer,
        type: contentType,
        time: Date.now()
      });
      
      // Clean up cache if needed
      if (resourceCache.size > CACHE_SIZE_LIMIT) {
        cleanupCache();
      }
    }
    
    // Create and return a new response with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${getCacheDuration(path)}`,
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Resource-Origin': resourceDomain,
      },
    });
  } catch (error) {
    console.error(`Resource proxy error for ${path}:`, error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Timeout fetching resource: ${path}`);
      return createFallbackResponse(path);
    }
    
    // Return fallback for any error
    return createFallbackResponse(path);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Count',
      'Access-Control-Max-Age': '86400',
    },
  });
} 