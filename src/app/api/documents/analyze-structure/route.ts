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
  documentId?: string; // Om du har ett dokument-id, annars kan det vara null
  userId?: string; // Om du har användar-id, annars kan det vara null
}

export async function POST(request: NextRequest) {
  try {
    const { text, metadata, templateType, documentId, userId }: AnalysisRequest = await request.json();

    // Logga inkommande data
    console.log('[analyze-structure] Inkommande:', { textLength: text?.length, metadata, templateType, documentId, userId });

    if (!text || !metadata || !documentId) {
      return NextResponse.json({ error: 'Text, metadata och documentId krävs' }, { status: 400 });
    }

    // Validering av filstorlek och textlängd för att förhindra missbruk
    const maxTextLength = 100000; // Max 100k tecken (ca 50-100 sidor)
    const maxPages = 200; // Max 200 sidor
    
    if (text.length > maxTextLength) {
      return NextResponse.json({ 
        error: 'Dokumentet är för stort', 
        details: `Texten är ${text.length} tecken, max ${maxTextLength} tillåtet` 
      }, { status: 400 });
    }
    
    if (metadata.totalPages && metadata.totalPages > maxPages) {
      return NextResponse.json({ 
        error: 'Dokumentet har för många sidor', 
        details: `Dokumentet har ${metadata.totalPages} sidor, max ${maxPages} tillåtet` 
      }, { status: 400 });
    }

    console.log(`[analyze-structure] Validering OK: ${text.length} tecken, ${metadata.totalPages || 'okänt antal'} sidor`);

    const useAsync = process.env.USE_ASYNC_ANALYSIS === 'true';
    if (useAsync) {
      // Skapa analyze_job i analyze_jobs-tabellen (pending)
      const { data: jobData, error: jobError } = await supabase
        .from('analyze_jobs')
        .insert({
          user_id: userId || null,
          document_id: documentId,
          status: 'pending',
          result: null,
          error_message: null,
          input_text: text,
          input_metadata: metadata,
          input_template_type: templateType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (jobError) {
        return NextResponse.json({ error: 'Kunde inte skapa analyze-jobb', details: jobError.message }, { status: 500 });
      }
      console.log('[analyze-structure] Async mode: analyze_job skapad, id:', jobData.id);
      return NextResponse.json({ success: true, jobId: jobData.id, async: true });
    }

    // Synkront läge: kör OpenAI direkt
    // Skapa analyze_job i analyze_jobs-tabellen (status: running)
    const { data: jobData, error: jobError } = await supabase
      .from('analyze_jobs')
      .insert({
        user_id: userId || null,
        document_id: documentId,
        status: 'running',
        result: null,
        error_message: null,
        input_text: text,
        input_metadata: metadata,
        input_template_type: templateType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (jobError) {
      return NextResponse.json({ error: 'Kunde inte skapa analyze-jobb', details: jobError.message }, { status: 500 });
    }

    // Chunking-funktion för att hantera långa texter
    function chunkText(text: string, maxChunkSize: number = 2500): string[] {
      const chunks: string[] = [];
      const lines = text.split('\n');
      let currentChunk = '';
      
      for (const line of lines) {
        if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      const totalChunkLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const originalLength = text.replace(/\n/g, '').length;
      const chunkTextLength = chunks.join('').length;
      
      console.log(`[chunking] Original: ${originalLength} tecken, Chunks: ${chunkTextLength} tecken, Chunks: ${chunks.length}`);
      
      if (Math.abs(originalLength - chunkTextLength) > 100) {
        console.warn(`[chunking] VARNING: Möjlig textförlust! Original: ${originalLength}, Chunks: ${chunkTextLength}`);
      }
      
      return chunks;
    }

    // Dela upp texten i chunks och analysera varje del
    const textChunks = chunkText(text);
    console.log(`[analyze-structure] Delar upp text i ${textChunks.length} delar`);
    
    let allSections: any[] = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`[analyze-structure] Analyserar del ${i + 1}/${textChunks.length} (${chunk.length} tecken)`);
      
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 4000,
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: `Du är en expert på UX-design och dokumentstrukturering som skapar professionella, användarvänliga handböcker.
              
              UPPDRAG: Analysera denna del av dokumentet och skapa en PROFESSIONELL, UX-OPTIMERAD struktur. Detta är del ${i + 1} av ${textChunks.length}.
              
              GRUNDPRINCIPER:
              - EXTRAHERA all data och information (hoppa inte över något)
              - ORGANISERA innehållet för optimal användarupplevelse
              - SKAPA tydliga, logiska sektioner som är lätta att navigera
              - FÖRBÄTTRA strukturen för bättre läsbarhet och användning
              - BEVARA all information men presentera den professionellt
              
              UX-OPTIMERING (MYCKET VIKTIGT):
              - Skapa intuitive sektionstitlar som användare förstår direkt
              - Organisera information i logisk ordning (från allmänt till specifikt)
              - Gruppera relaterat innehåll tillsammans
              - Använd tydliga hierarkier (huvudrubriker → underrubriker → punkter)
              - Gör komplexa listor mer lättlästa med bra struktur
              - Separera olika typer av information (kontakt, regler, instruktioner, etc.)
              
              PROFESSIONELL PRESENTATION:
              - Skapa beskrivande, professionella sektionstitlar
              - Strukturera listor med tydliga punkter och underrubriker
              - Organisera kontaktinformation i lättläst format
              - Presentera instruktioner som steg-för-steg guides
              - Gör tabeller och data visuellt tillgängliga
              - Använd konsekvent formatering genom hela dokumentet
              
              DATAEXTRAKTION - Identifiera och bevara:
              - Alla rubriker och kategorier (förbättra titlarna om nödvändigt)
              - Alla listor och punkter (organisera för bättre läsbarhet)
              - All kontaktinformation (strukturera professionellt)
              - Alla instruktioner och procedurer (gör till tydliga steg)
              - Alla regler och riktlinjer (gruppera logiskt)
              - Alla tekniska data och specifikationer
              - Alla datum, tider och scheman
              - Alla koder, referenser och ansvarsbeteckningar
              
              SEKTIONSSTRUKTUR:
              - Skapa logiska huvudsektioner baserat på innehållstyp
              - Använd användarvänliga titlar (inte bara originalets rubriker)
              - Gruppera liknande information tillsammans
              - Skapa separata sektioner för olika ämnesområden
              - Prioritera information efter användarens behov
              
              EXEMPEL PÅ BRA STRUKTUR:
              - "Kontaktinformation och Support" (istället för bara "Kontakt")
              - "Regler och Riktlinjer" (tydligt grupperat)
              - "Steg-för-steg Instruktioner" (för procedurer)
              - "Ekonomi och Avgifter" (all ekonomisk info tillsammans)
              - "Säkerhet och Trygghet" (säkerhetsrelaterat innehåll)
              
              VIKTIGT: 
              - Returnera ENDAST giltig JSON
              - Varje sektion ska ha title, content och confidence (0-1)
              - Content ska vara professionellt strukturerat och lättläst
              - Fokusera på användarupplevelse och navigation
              - Behåll ALL information men presentera den bättre
              - Skapa en struktur som användare intuitivt förstår
              
              Format:
              {
                "sections": [
                  {
                    "title": "Professionell, användarvänlig sektionstittel",
                    "content": "Välstrukturerat innehåll optimerat för läsbarhet och användning",
                    "confidence": 0.9
                  }
                ]
              }`
            },
            { role: 'user', content: chunk }
          ],
        });
        
        const chunkResponse = completion.choices[0]?.message?.content || '';
        console.log(`[analyze-structure] Del ${i + 1} OpenAI response:`, chunkResponse.substring(0, 200) + '...');
        
        // Parsa JSON för denna chunk
        let chunkSections;
        try {
          chunkSections = JSON.parse(chunkResponse);
          const sections = chunkSections?.sections || chunkSections || [];
          if (Array.isArray(sections)) {
            allSections.push(...sections);
            console.log(`[analyze-structure] Del ${i + 1} gav ${sections.length} sektioner`);
          }
        } catch (parseError) {
          console.error(`[analyze-structure] Kunde inte parsa JSON för del ${i + 1}:`, parseError);
        }
        
      } catch (chunkError) {
        console.error(`[analyze-structure] Fel vid analys av del ${i + 1}:`, chunkError);
      }
    }

    console.log(`[analyze-structure] Totalt ${allSections.length} sektioner från alla delar`);
    
    // Använd alla sektioner som resultat
    const aiSections = allSections;

    // Säkerställ att vi har rätt struktur
    console.log('[analyze-structure] Slutlig sektionsstruktur:', { 
      sectionsCount: Array.isArray(aiSections) ? aiSections.length : 'inte array',
      firstSection: Array.isArray(aiSections) && aiSections[0] ? Object.keys(aiSections[0]) : 'ingen'
    });

    // Spara resultat i analyze_jobs (status: done/error)
    await supabase
      .from('analyze_jobs')
      .update({
        status: aiSections.length > 0 ? 'done' : 'error',
        result: aiSections,
        error_message: aiSections.length > 0 ? null : 'Ingen giltig sektion hittad',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobData.id);
    if (aiSections.length > 0) {
      return NextResponse.json({ success: true, sections: aiSections, jobId: jobData.id, async: false });
    } else {
      return NextResponse.json({ error: 'Ingen giltig sektion hittad', jobId: jobData.id, async: false });
    }
  } catch (error: any) {
    console.error('[analyze-structure] Fatal error:', error);
    return NextResponse.json({ error: 'Ett oväntat fel inträffade', details: error.message }, { status: 500 });
  }
}

// Hjälpfunktion för att få nyckelord för olika sektioner (generisk version)
function getKeywordsForSection(sectionTitle: string): string[] {
  // Generiska nyckelord baserat på vanliga sektionstyper
  const keywordMap: { [key: string]: string[] } = {
    'Introduktion': ['välkommen', 'introduktion', 'presentation', 'översikt'],
    'Organisation': ['organisation', 'struktur', 'ansvar', 'roller'],
    'Ekonomi': ['ekonomi', 'budget', 'kostnad', 'avgift', 'pris'],
    'Regler': ['regler', 'policy', 'riktlinjer', 'föreskrifter'],
    'Teknik': ['teknisk', 'installation', 'system', 'utrustning'],
    'Underhåll': ['underhåll', 'reparation', 'service', 'skötsel'],
    'Säkerhet': ['säkerhet', 'trygghet', 'brand', 'nödsituation'],
    'Kontakt': ['kontakt', 'telefon', 'e-post', 'adress']
  };

  // Försök matcha sektionstiteln mot nyckelorden
  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => sectionTitle.toLowerCase().includes(keyword))) {
      return keywords;
    }
  }

  return [];
} 