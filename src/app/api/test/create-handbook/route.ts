import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';
import { HandbookTemplate } from '@/lib/templates/complete-brf-handbook';
import { getServiceSupabase, testDatabaseConnection } from '@/lib/supabase';
import { createDirectClient, testDirectConnection } from '@/lib/direct-db';
import { createHandbookViaProxy, testProxyConnection } from '@/lib/proxy-db';

export const runtime = 'edge';
export const preferredRegion = ['arn1']; 

// Modifierad version som försöker direktanslutning som fallback
async function createHandbookDirectly(name: string, subdomain: string, template: HandbookTemplate) {
  try {
    console.log("[TEST API] Försöker skapa handbok direkt via Postgrest API");
    const client = createDirectClient();
    
    // 1. Skapa handboken
    const { data: handbookData, error: handbookError } = await client
      .from('handbooks')
      .insert([{ 
        name, 
        subdomain, 
        published: true 
      }])
      .select('id')
      .single();
    
    if (handbookError) {
      throw handbookError;
    }
    
    const handbookId = handbookData.id;
    console.log("[TEST API] Handbok skapad med ID:", handbookId);
    
    // 2. Skapa sektioner
    for (const section of template.sections) {
      const { data: sectionData, error: sectionError } = await client
        .from('sections')
        .insert([{
          title: section.title,
          description: section.description,
          order: section.order,
          handbook_id: handbookId
        }])
        .select('id')
        .single();
      
      if (sectionError) {
        throw sectionError;
      }
      
      const sectionId = sectionData.id;
      console.log("[TEST API] Sektion skapad:", sectionId);
      
      // 3. Skapa sidor för sektionen
      for (const page of section.pages) {
        const { error: pageError } = await client
          .from('pages')
          .insert([{
            title: page.title,
            content: page.content,
            order: page.order,
            section_id: sectionId
          }]);
        
        if (pageError) {
          throw pageError;
        }
      }
    }
    
    return handbookId;
  } catch (error) {
    console.error("[TEST API] Fel vid direkt handboksskapande:", error);
    throw error;
  }
}

// OBS! Detta är en testroute som bara finns i testmiljön
export async function POST(req: NextRequest) {
  // Förberedande diagnostik
  console.log("[TEST API] Anrop till create-handbook", new Date().toISOString());
  console.log("[TEST API] Miljövariabler: ", {
    urlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    isEdgeRuntime: typeof EdgeRuntime !== 'undefined',
    vercelRegion: process.env.VERCEL_REGION || null,
  });
  
  // Hantera CORS
  if (req.method === 'OPTIONS') {
    console.log("[TEST API] OPTIONS-anrop hanteras");
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    // Testa alla anslutningsmetoder
    console.log("[TEST API] Testar databasanslutningar...");
    const standardConnection = await testDatabaseConnection();
    let directConnection = null;
    let proxyConnection = null;
    
    // Om standardanslutningen misslyckades, testa direktanslutning
    if (!standardConnection.connected) {
      console.log("[TEST API] Standard databaskoppling misslyckades, testar direktanslutning");
      directConnection = await testDirectConnection();
      
      // Om direktanslutningen också misslyckades, testa proxyanslutning
      if (!directConnection.connected) {
        console.log("[TEST API] Direktanslutning misslyckades, testar proxyanslutning");
        proxyConnection = await testProxyConnection();
        
        if (!proxyConnection.connected) {
          console.error("[TEST API] Alla anslutningsmetoder misslyckades:", 
                    { standard: standardConnection.error, direct: directConnection.error, proxy: proxyConnection.error });
          return NextResponse.json({ 
            error: 'Kunde inte ansluta till databasen med någon metod', 
            details: {
              standard: standardConnection.error,
              direct: directConnection.error,
              proxy: proxyConnection ? proxyConnection.error : 'Not tested'
            }
          }, { 
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          });
        }
        
        console.log("[TEST API] Proxyanslutning OK!");
      } else {
        console.log("[TEST API] Direktkoppling OK!");
      }
    } else {
      console.log("[TEST API] Standard databaskoppling OK");
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
    let requestBody;
    try {
      requestBody = await req.text();
      console.log("[TEST API] Request body:", requestBody);
    } catch (bodyError) {
      console.error("[TEST API] Fel vid inläsning av request body:", bodyError);
      throw new Error("Kunde inte läsa request body");
    }
    
    let name, subdomain;
    try {
      const body = JSON.parse(requestBody);
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
    
    // Validera subdomän
    const subdomainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainPattern.test(subdomain)) {
      console.log("[TEST API] Ogiltig subdomän:", subdomain);
      return NextResponse.json(
        { 
          error: 'Ogiltig subdomän', 
          details: 'Subdomänen får endast innehålla små bokstäver, siffror och bindestreck. Den får inte börja eller sluta med bindestreck.'
        },
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
    
    try {
      // Skapa handboken med rätt metod baserat på anslutningsförmåga
      let handbookId;
      let method = 'unknown';
      
      if (standardConnection.connected) {
        // Använd standard-metoden om den fungerade
        console.log("[TEST API] Anropar createHandbookWithSectionsAndPages (standard)");
        handbookId = await createHandbookWithSectionsAndPages(name, subdomain, testTemplate);
        method = 'standard';
      } else if (directConnection && directConnection.connected) {
        // Använd direktmetoden som första fallback
        console.log("[TEST API] Anropar createHandbookDirectly (fallback 1)");
        handbookId = await createHandbookDirectly(name, subdomain, testTemplate);
        method = 'direct';
      } else if (proxyConnection && proxyConnection.connected) {
        // Använd proxymetoden som sista utväg
        console.log("[TEST API] Anropar createHandbookViaProxy (fallback 2)");
        handbookId = await createHandbookViaProxy(name, subdomain);
        // Eftersom vi bara skapar handboken utan sektioner via proxy, logga detta
        console.log("[TEST API] OBS: Sektioner och sidor skapas inte via proxy-metoden");
        method = 'proxy';
      } else {
        throw new Error("Ingen fungerande anslutningsmetod hittades, vilket borde ha fångats tidigare");
      }
      
      console.log("[TEST API] Handbok skapad, ID:", handbookId);
      
      // Returnera med CORS-headers
      return NextResponse.json({ 
        success: true, 
        handbookId, 
        name,
        subdomain,
        url: `https://${subdomain}.handbok.org`,
        method
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    } catch (dbError) {
      console.error("[TEST API] Databas-fel vid skapande:", dbError);
      return NextResponse.json({ 
        error: 'Fel vid skapande av handboken i databasen', 
        details: dbError.message,
        errorInfo: {
          message: dbError.message,
          name: dbError.name,
          code: dbError.code
        }
      }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }
  } catch (error) {
    // Förbättrad felhantering med mer detaljer
    const errorDetails = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Begränsa stackspårningen
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