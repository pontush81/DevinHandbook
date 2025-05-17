import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { HandbookTemplate } from '@/lib/templates/handbook-template';

// OBS! Detta är en testroute som bara finns i testmiljön
export async function POST(req: NextRequest) {
  try {
    // Logga varje steg för felsökning
    console.log("[TEST API] Anrop till create-handbook");
    
    // Hantera CORS
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // Verifiera att vi är i testmiljö
    const host = req.headers.get('host') || '';
    console.log("[TEST API] Host:", host);
    
    if (!host.includes('test.handbok.org')) {
      console.log("[TEST API] Fel host, inte test.handbok.org");
      return NextResponse.json({ error: 'Endast tillgängligt i testmiljön' }, { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }
    
    // Hämta namn och subdomän från request
    const bodyText = await req.text();
    console.log("[TEST API] Request body:", bodyText);
    
    let name, subdomain;
    try {
      const body = JSON.parse(bodyText);
      name = body.name;
      subdomain = body.subdomain;
      console.log("[TEST API] Parsad data:", { name, subdomain });
    } catch (parseError) {
      console.error("[TEST API] Fel vid parsning av JSON:", parseError);
      return NextResponse.json(
        { error: 'Ogiltig JSON i begäran', details: parseError.message },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    if (!name || !subdomain) {
      console.log("[TEST API] Saknas namn eller subdomän:", { name, subdomain });
      return NextResponse.json(
        { error: 'Både namn och subdomän måste anges' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    // Skapa en enkel mall för testet
    console.log("[TEST API] Skapar mall");
    const testTemplate: HandbookTemplate = {
      sections: [
        {
          id: "test-section",
          title: "Testsektion",
          description: "Detta är en testsektion",
          order: 0,
          isActive: true,
          pages: [
            {
              id: "test-page",
              title: "Testsida",
              content: "# Detta är en testsida\n\nSkapad för att testa att subdomäner fungerar.",
              order: 0
            }
          ]
        }
      ]
    };
    
    // Skapa handboken
    console.log("[TEST API] Anropar createHandbookWithSectionsAndPages");
    const handbookId = await createHandbookWithSectionsAndPages(name, subdomain, testTemplate);
    console.log("[TEST API] Handbok skapad, ID:", handbookId);
    
    // Returnera med CORS-headers
    return NextResponse.json({ 
      success: true, 
      handbookId, 
      name,
      subdomain,
      url: `https://${subdomain}.handbok.org`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    // Förbättrad felhantering med mer detaljer
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause ? String(error.cause) : undefined
    };
    
    console.error('[TEST API] Detaljerat fel:', JSON.stringify(errorDetails, null, 2));
    console.error('[TEST API] Error i testrouten:', error);
    
    return NextResponse.json(
      { 
        error: 'Fel vid skapande av testhandbok', 
        details: error.message,
        errorInfo: errorDetails
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
} 