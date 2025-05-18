import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const host = request.headers.get('host') || '';
  
  if (!path) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }
  
  // För debugging
  console.log('Resource proxy request for path:', path, 'from host:', host);
  
  try {
    // Dynamisk hantering av resurskällor baserat på miljö
    const isProd = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
    const isTest = process.env.VERCEL_ENV === 'preview' || !isProd;
    
    // Baserad på miljö, välj rätt källdomän för resurser
    let sourceHost = 'devin-handbook.vercel.app'; // Default 
    
    // Om vi är på en faktisk subdomän, använd huvuddomänen som källa
    if (host.endsWith('.handbok.org')) {
      if (host.includes('.test.')) {
        // Hantera nested test subdomäner: foo.test.handbok.org
        sourceHost = 'test.handbok.org';
      } else if (host.startsWith('test.')) {
        // Hantera test subdomäner: test.foo.handbok.org
        sourceHost = 'test.handbok.org';
      } else {
        // Vanliga subdomäner
        sourceHost = 'handbok.org';
      }
    }
    
    console.log(`Environment: ${isProd ? 'PRODUCTION' : 'TEST/DEV'}, using source: ${sourceHost}`);
    
    // Direkt URL-konstruktion för enklare hantering
    let resourceURL;
    
    // För CSS och andra statiska filer, förväntar vi rätt path format
    if (path.startsWith('/')) {
      resourceURL = `https://${sourceHost}${path}`;
    } else {
      resourceURL = `https://${sourceHost}/${path}`;
    }
    
    console.log('Fetching resource from:', resourceURL);
    
    // Specialhantering för vissa filtyper
    if (path.endsWith('.css')) {
      // För CSS-filer, försök först hämta från källan, fallback till egen CSS
      try {
        const response = await fetch(resourceURL, {
          method: 'GET',
          headers: {
            'User-Agent': 'Handbok-Proxy/1.0',
            'Accept': 'text/css,*/*',
            'Origin': `https://${sourceHost}`
          },
          next: { revalidate: 3600 }
        });
        
        if (response.ok) {
          const css = await response.text();
          console.log('Successfully fetched CSS, size:', css.length);
          return new NextResponse(css, {
            headers: {
              'Content-Type': 'text/css',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            }
          });
        } else {
          throw new Error(`CSS fetch failed with status ${response.status}`);
        }
      } catch (cssError) {
        console.log('CSS fetch failed, using fallback:', cssError);
        // Fallback CSS för alla CSS-filer som inte kan hämtas
        const fallbackCss = `
          /* Fallback CSS för ${path} */
          body { 
            font-family: system-ui, sans-serif; 
            background: #f7f7f7;
          }
          .testElement { 
            background-color: #f0f0f0 !important;
            border: 1px solid #ccc !important;
            padding: 20px !important;
            border-radius: 4px !important;
          }
        `;
        
        return new NextResponse(fallbackCss, {
          headers: {
            'Content-Type': 'text/css',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    }
    
    // Hantera font-filer speciellt
    if (path.includes('/fonts/') || 
        path.endsWith('.woff') || 
        path.endsWith('.woff2') || 
        path.endsWith('.ttf')) {
      console.log('Font resource detected, setting special headers');
    }
    
    // Standard fetch för alla andra filtyper
    const response = await fetch(resourceURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Handbok-Proxy/1.0',
        'Accept': '*/*',
        'Origin': `https://${sourceHost}`
      },
      next: { revalidate: 3600 } // Caching med revalidering efter 1 timme
    });
    
    if (!response.ok) {
      console.error(`Resource fetch failed: ${response.status} for ${resourceURL}`);
      
      // Fallback för olika filtyper
      if (path.endsWith('.js')) {
        console.log('Providing fallback JS content');
        return new NextResponse('console.log("Fallback JS loaded for ' + path + '");', {
          headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else if (path.includes('/fonts/') || 
                 path.endsWith('.woff') || 
                 path.endsWith('.woff2') || 
                 path.endsWith('.ttf')) {
        // För fontfiler, returnera en korrekt formatterad tomfil
        console.log('Providing empty font file');
        return new NextResponse(new ArrayBuffer(0), {
          headers: {
            'Content-Type': path.endsWith('.woff2') ? 'font/woff2' : 
                           path.endsWith('.woff') ? 'font/woff' : 
                           path.endsWith('.ttf') ? 'font/ttf' : 
                           'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
      
      // Ge mer detaljerad felinformation för övriga filtyper
      return new NextResponse(
        JSON.stringify({
          error: `Failed to fetch resource: ${response.statusText}`,
          status: response.status,
          resource: resourceURL,
          path: path,
          host: host,
          sourceHost: sourceHost
        }), 
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    // Klona svaret och lägg till CORS-headers
    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || getContentTypeFromPath(path);
    
    const headers = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Proxy-Source': sourceHost
    });
    
    // Bevara viktiga headers från originalsvaret
    const contentEncoding = response.headers.get('content-encoding');
    if (contentEncoding) {
      headers.set('Content-Encoding', contentEncoding);
    }
    
    return new NextResponse(body, {
      headers,
      status: 200
    });
  } catch (error) {
    console.error('Resource proxy error:', error);
    
    // Ge detaljerad felinformation
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error),
        path: path,
        timestamp: new Date().toISOString(),
        host: host
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// Hjälpfunktion för att gissa MIME-typ från filsökväg
function getContentTypeFromPath(path: string): string {
  if (path.endsWith('.js')) return 'application/javascript; charset=UTF-8';
  if (path.endsWith('.css')) return 'text/css; charset=UTF-8';
  if (path.endsWith('.html')) return 'text/html; charset=UTF-8';
  if (path.endsWith('.json')) return 'application/json; charset=UTF-8';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.ttf')) return 'font/ttf';
  return 'application/octet-stream';
}

export async function OPTIONS() {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  });
  
  return new NextResponse(null, {
    headers,
    status: 204
  });
} 