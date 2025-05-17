import { NextRequest, NextResponse } from 'next/server';
import { createHandbookWithSectionsAndPages } from '@/lib/handbook-service';

// OBS! Detta är en testroute som bara finns i testmiljön
export async function POST(req: NextRequest) {
  try {
    // Verifiera att vi är i testmiljö
    const host = req.headers.get('host') || '';
    if (!host.includes('test.handbok.org')) {
      return NextResponse.json({ error: 'Endast tillgängligt i testmiljön' }, { status: 403 });
    }
    
    // Hämta namn och subdomän från request
    const { name, subdomain } = await req.json();
    
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: 'Både namn och subdomän måste anges' },
        { status: 400 }
      );
    }
    
    // Skapa en enkel mall för testet
    const testTemplate = {
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
    const handbookId = await createHandbookWithSectionsAndPages(name, subdomain, testTemplate);
    
    return NextResponse.json({ 
      success: true, 
      handbookId, 
      name,
      subdomain,
      url: `https://${subdomain}.handbok.org`
    });
  } catch (error) {
    console.error('Error i testrouten:', error);
    return NextResponse.json(
      { error: 'Fel vid skapande av testhandbok', details: error.message },
      { status: 500 }
    );
  }
} 