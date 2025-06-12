import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';
import OpenAI from 'openai';

// Initiera Supabase client med service role för server-side operationer
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initiera OpenAI klient
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisRequest {
  text: string;
  metadata: {
    title: string;
    totalPages: number;
    language: string;
    documentType: string;
  };
  templateType: 'brf' | 'generic';
}

export async function POST(request: NextRequest) {
  try {
    const { text, metadata, templateType }: AnalysisRequest = await request.json();

    if (!text || !metadata) {
      return NextResponse.json({ error: 'Text och metadata krävs' }, { status: 400 });
    }

    // Kontrollera om texten är för kort eller är en fallback-text
    if (text.trim().length < 100 || text.includes('textextraktion misslyckades')) {
      return NextResponse.json({ 
        error: 'Dokumentet kunde inte bearbetas automatiskt. Textextraktionen misslyckades eller texten är för kort för AI-analys. Vänligen ladda upp dokumentet i ett annat format eller skapa handboken manuellt.',
        fallback: true
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API-nyckel är inte konfigurerad' 
      }, { status: 500 });
    }

    // Förbered mallen för strukturering
    const templateSections = completeBRFHandbook.sections.map(section => ({
      title: section.title,
      description: section.description,
      keywords: getKeywordsForSection(section.title)
    }));

    // Skapa AI-prompt för strukturanalys
    const systemPrompt = `Du är en expert på att strukturera BRF-handböcker. Din uppgift är att analysera ett dokument och dela upp det i logiska sektioner som matchar standarden för BRF-handböcker.

Tillgängliga sektioner för BRF-handböcker:
${templateSections.map((section, index) => 
  `${index + 1}. ${section.title}: ${section.description}
     Vanliga nyckelord: ${section.keywords.join(', ')}`
).join('\n')}

Analysera dokumentet och returnera ENDAST ett JSON-objekt enligt följande format:
{
  "sections": [
    {
      "title": "Sektionsnamn (välj från listan ovan eller föreslå nytt)",
      "content": "Innehållet för denna sektion",
      "confidence": 0.9,
      "suggestedMapping": "Hemförsäkring och försäkringar"
    }
  ]
}

Regler:
- Dela upp texten i logiska sektioner baserat på rubriker och innehåll
- Varje sektion ska ha minst 50 tecken innehåll
- Confidence ska vara mellan 0.1-1.0 baserat på hur säker du är på mappningen
- Försök mappa till befintliga BRF-sektioner när det är möjligt
- Om innehållet inte passar någon befintlig sektion, föreslå en ny titel
- Behåll original-formatering och struktur så mycket som möjligt`;

    const userPrompt = `Dokumenttitel: ${metadata.title}
Dokumenttyp: ${metadata.documentType}
Språk: ${metadata.language}
${metadata.totalPages ? `Antal sidor: ${metadata.totalPages}` : ''}

Dokument att analysera:
${text}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        return NextResponse.json({ 
          error: 'Ingen respons från AI-analysen' 
        }, { status: 500 });
      }

      let analysisResult;
      try {
        analysisResult = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Fel vid parsning av AI-respons:', parseError);
        return NextResponse.json({ 
          error: 'Kunde inte tolka AI-responsen' 
        }, { status: 500 });
      }

      // Validera och förbättra resultatet
      if (!analysisResult.sections || !Array.isArray(analysisResult.sections)) {
        return NextResponse.json({ 
          error: 'Ogiltigt analysresultat från AI' 
        }, { status: 500 });
      }

      // Filtrera och validera sektioner
      const validSections = analysisResult.sections
        .filter((section: any) => 
          section.title && 
          section.content && 
          section.content.trim().length >= 50
        )
        .map((section: any, index: number) => ({
          title: section.title.trim(),
          content: section.content.trim(),
          confidence: Math.max(0.1, Math.min(1.0, section.confidence || 0.7)),
          suggestedMapping: section.suggestedMapping || section.title,
          order: index + 1
        }));

      if (validSections.length === 0) {
        return NextResponse.json({ 
          error: 'Inga giltiga sektioner kunde identifieras' 
        }, { status: 400 });
      }

      // Spara analysen i databasen
      const { data: analysisData, error: analysisError } = await supabase
        .from('document_analyses')
        .insert({
          original_text: text.substring(0, 10000), // Begränsa storlek
          metadata: {
            ...metadata,
            analysis_time: new Date().toISOString(),
            model: "gpt-4o-mini",
            prompt_version: "1.0"
          },
          analysis_result: {
            sections: validSections,
            summary: {
              total_sections: validSections.length,
              avg_confidence: validSections.reduce((sum: number, s: any) => sum + s.confidence, 0) / validSections.length,
              template_type: templateType
            }
          },
          template_type: templateType
        })
        .select()
        .single();

      if (analysisError) {
        console.error('Fel vid sparning av analys:', analysisError);
        // Fortsätt ändå och returnera resultatet
      }

      return NextResponse.json({
        success: true,
        sections: validSections,
        summary: {
          total_sections: validSections.length,
          avg_confidence: validSections.reduce((sum: number, s: any) => sum + s.confidence, 0) / validSections.length,
          template_type: templateType
        },
        analysis_id: analysisData?.id
      });

    } catch (openaiError) {
      console.error('Fel vid AI-analys:', openaiError);
      return NextResponse.json({ 
        error: 'Kunde inte genomföra AI-analys' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Oväntat fel vid strukturanalys:', error);
    return NextResponse.json({ 
      error: 'Ett oväntat fel inträffade' 
    }, { status: 500 });
  }
}

// Hjälpfunktion för att få nyckelord för olika sektioner
function getKeywordsForSection(sectionTitle: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    'Välkommen till din BRF': ['välkommen', 'introduktion', 'presentation', 'bostadsrättsförening'],
    'Om föreningen': ['styrelse', 'organisation', 'historia', 'bildad', 'medlemmar'],
    'Ekonomi och avgifter': ['månadsavgift', 'ekonomi', 'budget', 'kostnad', 'avgift'],
    'Regler och ordningsregler': ['regler', 'ordning', 'förbjudet', 'tillåtet', 'policy'],
    'Fastigheten och teknik': ['fastighet', 'teknisk', 'installation', 'system', 'underhåll'],
    'Renovering och underhåll': ['renovering', 'underhåll', 'reparation', 'upprustning', 'förbättring'],
    'Hemförsäkring och försäkringar': ['försäkring', 'hemförsäkring', 'skada', 'ansvar'],
    'Uthyrning och andrahandsuthyrning': ['uthyrning', 'andrahand', 'hyra', 'kontrakt'],
    'Försäljning av bostadsrätt': ['försäljning', 'köp', 'överlåtelse', 'pantbrev'],
    'Parkeringsplatser': ['parkering', 'garage', 'bilplats', 'parkering'],
    'Gemensamma utrymmen': ['gemensamma', 'utrymmen', 'tvättstuga', 'förråd'],
    'Sophantering och återvinning': ['sopor', 'återvinning', 'avfall', 'kompost'],
    'Trygghet och säkerhet': ['trygghet', 'säkerhet', 'larm', 'brand', 'nödsituation'],
    'Kontaktuppgifter': ['kontakt', 'telefon', 'e-post', 'adress', 'styrelse']
  };

  return keywordMap[sectionTitle] || [];
} 