import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'info';
  
  // Ger grundläggande miljöinformation för felsökning
  const basicInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    host: request.headers.get('host') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: new URL(request.url).pathname,
    referrer: request.headers.get('referer') || 'none',
    vercelEnv: process.env.VERCEL_ENV || 'unknown'
  };
  
  try {
    switch (mode) {
      case 'css': {
        // Returnera en enkel CSS för testning
        const css = `
          body { 
            font-family: system-ui, sans-serif; 
            background: #f7f7f7;
          }
          .debug-test { 
            color: blue; 
            border: 2px solid green;
            padding: 10px;
          }
        `;
        
        return new NextResponse(css, {
          headers: {
            'Content-Type': 'text/css',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          }
        });
      }
      
      case 'js': {
        // Returnera en enkel JavaScript för testning
        const js = `
          console.log("Debug JS loaded successfully");
          window.debugTestLoaded = true;
          document.addEventListener('DOMContentLoaded', () => {
            const el = document.createElement('div');
            el.className = 'debug-test';
            el.textContent = 'Debug JS loaded at ' + new Date().toISOString();
            document.body.appendChild(el);
          });
        `;
        
        return new NextResponse(js, {
          headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          }
        });
      }
      
      case 'headers': {
        // Visa alla request headers för felsökning
        const headers = Object.fromEntries(
          [...request.headers.entries()].map(([key, value]) => [key, value])
        );
        
        return NextResponse.json({ 
          ...basicInfo,
          headers 
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        });
      }
      
      case 'resource-test': {
        // Testa om vi kan hämta resurser från Vercel
        const vercelDeployment = 'devin-handbook.vercel.app';
        const cssPath = '/_next/static/css/bb2534fb94d47e9a.css';
        const resourceURL = `https://${vercelDeployment}${cssPath}`;
        
        try {
          const resourceResponse = await fetch(resourceURL, {
            method: 'GET',
            headers: {
              'User-Agent': 'Debug-Tool/1.0',
              'Accept': '*/*'
            }
          });
          
          if (!resourceResponse.ok) {
            return NextResponse.json({
              ...basicInfo,
              resourceTest: {
                status: 'failed',
                url: resourceURL,
                error: `HTTP ${resourceResponse.status}: ${resourceResponse.statusText}`
              }
            }, {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
              }
            });
          }
          
          // Läs bara de första 100 tecknen av resursen
          const text = await resourceResponse.text();
          const preview = text.substring(0, 100) + '...';
          
          return NextResponse.json({
            ...basicInfo,
            resourceTest: {
              status: 'success',
              url: resourceURL,
              contentType: resourceResponse.headers.get('content-type'),
              preview
            }
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          return NextResponse.json({
            ...basicInfo,
            resourceTest: {
              status: 'error',
              url: resourceURL,
              error: error instanceof Error ? error.message : String(error)
            }
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      default:
        // Standard info mode
        return NextResponse.json({
          ...basicInfo,
          debugModes: {
            'css': '/api/debug?mode=css',
            'js': '/api/debug?mode=js',
            'headers': '/api/debug?mode=headers',
            'resource-test': '/api/debug?mode=resource-test'
          },
          otherEndpoints: {
            'diagnosis': '/api/diagnosis',
            'resources': '/api/resources?path=YOUR_PATH',
            'test-page': '/test-resources'
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      ...basicInfo
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }
  });
} 