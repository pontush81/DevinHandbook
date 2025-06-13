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

    // Kontrollera om texten är för kort eller är en fallback-text för scannade PDF:er
    if (text.trim().length < 100 || 
        text.includes('textextraktion misslyckades') ||
        text.includes('Detta verkar vara en scannad PDF') ||
        text.includes('scannad PDF-fil som innehåller bilder') ||
        metadata.documentType === 'pdf_scanned') {
      
      return NextResponse.json({ 
        error: 'Detta verkar vara en scannad PDF-fil som innehåller bilder istället för text. För att kunna analysera detta dokument behöver du konvertera det till sökbar text med OCR-programvara.',
        fallback: true,
        scannedPdf: true
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
    const systemPrompt = `Du är en expert handboksförfattare som skapar digitala handböcker. Din uppgift är att analysera ett dokument och strukturera det för att skapa en användbar digital handbok.

DITT MÅL: Skapa en logisk och användbar handboksstruktur baserat på dokumentets FAKTISKA innehåll.

ANALYSPROCESS:
1. Identifiera dokumentets typ och syfte
2. Hitta naturliga avdelningar, kapitel, rubriker eller teman
3. Skapa sektioner som är användbara för läsare av en digital handbok
4. Använd dokumentets egna rubriker när de finns
5. Gruppera relaterat innehåll logiskt

EXEMPEL PÅ BRA SEKTIONSINDELNING:

För stadgar/regler:
- Använd faktiska paragrafer: "§ 1 Föreningens namn", "§ 2 Medlemskap"

För instruktioner/manualer:
- Följ stegen: "Installation", "Grundläggande användning", "Felsökning"

För policydokument:
- Använd policyområden: "Säkerhetspolicy", "IT-policy", "Personalregler"

För informationsdokument:
- Gruppera efter ämne: "Om företaget", "Kontaktuppgifter", "Tjänster"

VIKTIGA PRINCIPER:
- Skapa ALDRIG generiska sektioner som inte motsvarar dokumentets innehåll
- Använd dokumentets egna rubriker och struktur som grund
- Varje sektion ska vara meningsfull och användbar för handboksläsare
- Anpassa antalet sektioner efter dokumentets komplexitet
- För långa dokument (10+ sidor): Skapa MINST 10-20 sektioner för bättre navigation
- För stadgar/regelsamlingar: Skapa en sektion för varje paragraf eller kapitel
- För manualer: Dela upp i detaljerade steg och funktioner
- VIKTIGT: Skapa fler, mindre sektioner istället för få, stora sektioner

Returnera ENDAST ett JSON-objekt enligt följande format:
{
  "sections": [
    {
      "title": "Beskrivande titel baserad på dokumentets innehåll",
      "content": "Relevant innehåll för denna sektion",
      "confidence": 0.9,
      "suggestedMapping": "Kort beskrivning av sektionens syfte"
    }
  ]
}

KRITISKA JSON-FORMATERINGSREGLER:
- Använd ENDAST dubbla citattecken (") för JSON-strängar
- Escapa alla citattecken i innehållet med \"
- Använd \\n för radbrytningar (inte faktiska radbrytningar)
- Inkludera FULLSTÄNDIGT innehåll för varje sektion - detta är en komplett migration
- Varje sektion ska innehålla ALL relevant text från originaldokumentet
- VIKTIGT: Börja content-texten direkt med innehållet, ALDRIG med titeln igen!
- Behåll all viktig information, regler, instruktioner och detaljer
- Undvik specialtecken som kan bryta JSON-format

KRITISKA FORMATERINGSREGLER för content-fältet:

🚫 ABSOLUT FÖRBJUDET - Upprepa ALDRIG sektionstiteln i content-fältet:
- Om title är "§ 1 Firma, ändamål och säte" - börja INTE content med "§ 1" eller "Firma" eller "ändamål" eller "säte"
- Om title är "Stadgar" - börja INTE content med "Stadgar" eller "Dessa stadgar"
- Om title är "Kontaktuppgifter" - börja INTE content med "Kontaktuppgifter"
- Om title är "Aktivitetsrum" - börja INTE content med "Aktivitetsrum" eller "Ett aktivitetsrum"
- Titeln visas redan separat som rubrik - börja direkt med innehållet!
- VIKTIGT: Börja content med det första substantiella ordet som INTE finns i titeln!

✅ KORREKT FORMATERING:
- Använd dubbla radbrytningar (\\n\\n) mellan stycken för bättre läsbarhet
- Skapa punktlistor med "• " för viktiga punkter
- Använd "**text**" för fetstil på viktiga begrepp
- Strukturera innehållet med tydliga stycken istället för en lång textklump
- Lägg till radbrytningar efter rubriker och före listor
- Gör texten läsbar och välstrukturerad

EXEMPEL PÅ KORREKT ANVÄNDNING:

✅ RÄTT (fullständigt innehåll utan titelupprepning):
Title: "§ 1 Firma, ändamål och säte"
Content: "Föreningens firma är Riksbyggen Bostadsrättsförening Segerstaden. Föreningen har till ändamål att främja medlemmarnas ekonomiska intressen genom att i föreningens hus, mot ersättning, till föreningens medlemmar upplåta bostadslägenheter för permanent boende, och i förekommande fall lokaler, till nyttjande utan begränsning i tiden. Föreningen ska i sin verksamhet främja de kooperativa principerna såsom de kommer till uttryck i dessa stadgar och verka för en socialt, ekonomiskt och miljömässigt hållbar utveckling. Föreningens styrelse ska ha sitt säte i Växjö kommun."

✅ RÄTT (aktivitetsrum exempel):
Title: "Aktivitetsrum"
Content: "Ett stort bord med 10 stolar finns att använda med dimbar belysning ovanför. Darttavla med belysning ovanför är installerad. För att tända den belysningen så sker det direkt på armaturen på högersida."

✅ RÄTT (komplett sektion):
Title: "Styrelse och förvaltning"
Content: "Styrelsen består av minst tre och högst sju ledamöter som väljs av föreningsstämman för en mandatperiod om ett år. Ordföranden leder styrelsens arbete och representerar föreningen utåt. Sekreteraren ansvarar för protokollföring och korrespondens. Styrelsen sammanträder minst fyra gånger per år och är beslutsför när minst hälften av ledamöterna är närvarande."

🚫 FEL (upprepar titeln):
Title: "§ 1 Firma, ändamål och säte"
Content: "§ 1 Firma, ändamål och säte - Föreningen främjar..."

🚫 FEL (upprepar paragrafnummer):
Title: "§ 50 Sammanträden"
Content: "§ 50 Ordföranden ska se till att sammanträde hålls..."

🚫 FEL (upprepar delar av titeln):
Title: "Styrelse och förvaltning"
Content: "Styrelse och förvaltning består av..."

🚫 FEL (upprepar första ordet från titeln):
Title: "Aktivitetsrum"
Content: "Ett stort bord med 10 stolar finns att använda..."
PROBLEM: "Ett" är OK, men "Aktivitetsrum" får ALDRIG upprepas!

VIKTIGA REGLER:
- Skapa EN sektion för varje huvudavsnitt/kapitel i dokumentet
- Använd de FAKTISKA rubrikerna från dokumentet som sektionstitlar
- Om dokumentet har 15 kapitel, skapa 15 sektioner
- Om dokumentet har 3 huvuddelar, skapa 3 sektioner
- För LÅNGA dokument (20+ sidor): Dela upp stora kapitel i mindre delsektioner
- Varje sektion ska ha minst 50 tecken innehåll (kortare sektioner är OK för bättre navigation)
- Confidence ska vara mellan 0.1-1.0 baserat på hur tydlig strukturen är
- VIKTIGT: Formatera innehållet för maximal läsbarhet med stycken, listor och struktur
- Ta bort redundanta upprepningar av sektionstitlar i innehållet - titeln visas redan separat
- MÅL: Skapa så många relevanta sektioner som möjligt för bättre användbarhet`;

    const userPrompt = `Som handboksförfattare ska du analysera detta dokument och skapa en användbar struktur för en digital handbok.

DOKUMENTINFORMATION:
- Titel: ${metadata.title}
- Typ: ${metadata.documentType}
- Språk: ${metadata.language}
${metadata.totalPages ? `- Antal sidor: ${metadata.totalPages}` : ''}

UPPGIFT:
Analysera dokumentet nedan och skapa sektioner som är logiska och användbara för läsare av en digital handbok. Fokusera på dokumentets faktiska innehåll och struktur.

${metadata.totalPages && metadata.totalPages > 15 ? 
`🎯 SPECIELLA INSTRUKTIONER FÖR LÅNGT DOKUMENT (${metadata.totalPages} sidor):
- Detta är ett omfattande dokument som kräver strukturering
- Skapa EXAKT 12-15 väldefinierade sektioner (max 15 för att undvika JSON-trunkering)
- FULLSTÄNDIGT innehåll per sektion - inkludera all relevant text från originalet
- Fokusera på de viktigaste kapitlen och paragraferna
- Prioritera kvalitet över kvantitet - välj de mest relevanta sektionerna
- VIKTIGT: Korta sammanfattningar, inga långa texter!` : 
''}

DOKUMENT ATT ANALYSERA:
${text}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Tillbaka till billigare modell med optimerad prompt
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: metadata.totalPages && metadata.totalPages > 15 ? 12000 : 8000, // Högre gränser för fullständigt innehåll
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
        console.error('Problematisk AI-respons (första 1000 tecken):', responseContent.substring(0, 1000));
        console.error('Problematisk AI-respons (sista 1000 tecken):', responseContent.substring(Math.max(0, responseContent.length - 1000)));
        
        // Försök att reparera JSON genom att ta bort oavslutade strängar
        try {
          // Hitta sista giltiga JSON-struktur
          let repairedJson = responseContent;
          
          // Ta bort eventuell text efter sista }
          const lastBraceIndex = repairedJson.lastIndexOf('}');
          if (lastBraceIndex > 0) {
            repairedJson = repairedJson.substring(0, lastBraceIndex + 1);
          }
          
          // Om det fortfarande inte fungerar, försök att hitta sista kompletta sektion
          if (!repairedJson.includes('"sections"')) {
            throw new Error('Ingen sections-nyckel hittades');
          }
          
          // Försök att bygga om JSON med bara kompletta sektioner
          try {
            analysisResult = JSON.parse(repairedJson);
            console.log('✅ Lyckades reparera JSON');
          } catch (secondError) {
            // Sista försök: Hitta alla kompletta sektioner manuellt
            console.log('🔧 Försöker manuell JSON-reparation...');
            
            // Ny strategi: Leta efter individuella sektioner direkt i texten
            const sections = [];
            
            // Regex för att hitta sektioner - mycket mer flexibel
            const sectionPattern = /\{\s*"title":\s*"([^"]+)"\s*,\s*"content":\s*"([^"]+)"\s*,\s*"confidence":\s*([\d.]+)\s*(?:,\s*"suggestedMapping":\s*"([^"]*)")?\s*\}/g;
            
            let match;
            while ((match = sectionPattern.exec(responseContent)) !== null) {
              const [, title, content, confidence, suggestedMapping] = match;
              
              if (title && content && confidence) {
                sections.push({
                  title: title.trim(),
                  content: content.trim(),
                  confidence: parseFloat(confidence),
                  suggestedMapping: suggestedMapping || title.trim()
                });
              }
            }
            
            // Om regex inte fungerade, försök en enklare approach
            if (sections.length === 0) {
              console.log('🔧 Försöker alternativ extraction...');
              
              // Leta efter "title": följt av "content": följt av "confidence":
              const titleMatches = responseContent.match(/"title":\s*"([^"]+)"/g);
              const contentMatches = responseContent.match(/"content":\s*"([^"]+)"/g);
              const confidenceMatches = responseContent.match(/"confidence":\s*([\d.]+)/g);
              
              if (titleMatches && contentMatches && confidenceMatches) {
                const minLength = Math.min(titleMatches.length, contentMatches.length, confidenceMatches.length);
                
                for (let i = 0; i < minLength; i++) {
                  const title = titleMatches[i].match(/"title":\s*"([^"]+)"/)?.[1];
                  const content = contentMatches[i].match(/"content":\s*"([^"]+)"/)?.[1];
                  const confidence = confidenceMatches[i].match(/"confidence":\s*([\d.]+)/)?.[1];
                  
                  if (title && content && confidence) {
                    sections.push({
                      title: title.trim(),
                      content: content.trim(),
                      confidence: parseFloat(confidence),
                      suggestedMapping: title.trim()
                    });
                  }
                }
              }
            }
            
            if (sections.length > 0) {
              analysisResult = { sections };
              console.log(`✅ Lyckades extrahera ${sections.length} sektioner manuellt`);
            } else {
              throw new Error('Inga giltiga sektioner kunde extraheras från den trunkerade responsen');
            }
          }
        } catch (repairError) {
          console.error('❌ Kunde inte reparera JSON:', repairError);
          return NextResponse.json({ 
            error: 'Kunde inte tolka AI-responsen' 
          }, { status: 500 });
        }
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
          section.content.trim().length >= 100 // Kräv mer substantiellt innehåll för fullständig migration
        )
        .map((section: any, index: number) => {
          let cleanContent = section.content.trim();
          const title = section.title.trim();
          
          // AGGRESSIV titelrensning - ta bort ALLA varianter av titelupprepning
          const originalContent = cleanContent;
          
          // Steg 1: Ta bort exakt titel (case-insensitive)
          const exactTitleRegex = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:.\s]*`, 'i');
          cleanContent = cleanContent.replace(exactTitleRegex, '').trim();
          
          // Steg 2: Ta bort paragrafnummer från början
          cleanContent = cleanContent.replace(/^§\s*\d+\s*[-:.\s]*/, '').trim();
          
          // Steg 3: Ta bort titel utan paragrafnummer
          const titleWithoutParagraph = title.replace(/^§\s*\d+\s*/, '').trim();
          if (titleWithoutParagraph) {
            const titleWithoutParRegex = new RegExp(`^${titleWithoutParagraph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:.\s]*`, 'i');
            cleanContent = cleanContent.replace(titleWithoutParRegex, '').trim();
          }
          
          // Steg 4: Ta bort första ordet/frasen från titeln
          const firstWord = titleWithoutParagraph.split(/[,\s]+/)[0];
          if (firstWord && firstWord.length > 3) {
            const firstWordRegex = new RegExp(`^${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:.\s]*`, 'i');
            cleanContent = cleanContent.replace(firstWordRegex, '').trim();
          }
          
          // Steg 5: Ta bort alla kvarvarande separatorer från början
          cleanContent = cleanContent.replace(/^[-:.\s§\d\s,]*/, '').trim();
          
          // Steg 6: Om content blev för kort eller tom, behåll original men ta bara bort paragrafnummer
          if (cleanContent.length < 20 && originalContent.length > 50) {
            cleanContent = originalContent.replace(/^§\s*\d+\s*[-:.\s]*/, '').trim();
          }
          
          return {
            title: title,
            content: cleanContent,
            confidence: Math.max(0.1, Math.min(1.0, section.confidence || 0.7)),
            suggestedMapping: section.suggestedMapping || section.title,
            order: index + 1
          };
        });

      if (validSections.length === 0) {
        return NextResponse.json({ 
          error: 'Inga giltiga sektioner kunde identifieras' 
        }, { status: 400 });
      }

      // EXTRA SÄKERHETSÅTGÄRD: Dubbelkolla att inga titlar upprepas i content
      const finalSections = validSections.map((section: any) => {
        let content = section.content;
        const title = section.title;
        const originalContent = content;
        
        console.log(`🔧 Post-processing section: "${title}"`);
        console.log(`🔧 Original content start: "${content.substring(0, 100)}..."`);
        
        // SYSTEMATISK TITELRENSNING - Kör alla strategier i ordning
        
        // Förbered titel för matchning
        const titleClean = title.replace(/^§\s*\d+\s*/, '').trim();
        const titleWords = titleClean.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
        
        // STRATEGI 1: Exakt titelrensning (hela titeln)
        const exactTitleRegex = new RegExp(`^\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:.\s]*`, 'i');
        content = content.replace(exactTitleRegex, '').trim();
        console.log(`🔧 After exact title removal: "${content.substring(0, 50)}..."`);
        
        // STRATEGI 2: Titel utan paragrafnummer
        if (titleClean && titleClean !== title) {
          const titleRegex = new RegExp(`^\\s*${titleClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:.\s]*`, 'i');
          content = content.replace(titleRegex, '').trim();
          console.log(`🔧 After clean title removal: "${content.substring(0, 50)}..."`);
        }
        
        // STRATEGI 3: Första ordet från titeln
        if (titleWords.length > 0) {
          const firstTitleWord = titleWords[0];
          const firstWordRegex = new RegExp(`^\\s*${firstTitleWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:.\s]*`, 'i');
          content = content.replace(firstWordRegex, '').trim();
          console.log(`🔧 After first word removal: "${content.substring(0, 50)}..."`);
        }
        
        // STRATEGI 4: Ord-för-ord från början
        let contentWords = content.split(/\s+/);
        let wordsToRemove = 0;
        
        for (let i = 0; i < Math.min(titleWords.length, contentWords.length); i++) {
          const titleWord = titleWords[i].replace(/[^\w]/g, '').toLowerCase();
          const contentWord = contentWords[i].replace(/[^\w]/g, '').toLowerCase();
          
          if (titleWord === contentWord || 
              (titleWord.length > 3 && contentWord.length > 3 && 
               (titleWord.includes(contentWord) || contentWord.includes(titleWord)))) {
            wordsToRemove = i + 1;
            console.log(`🔧 Word match: "${titleWord}" ≈ "${contentWord}"`);
          } else if (contentWord.match(/^[-:.\s§\d,()]*$/)) {
            wordsToRemove = i + 1;
            console.log(`🔧 Separator: "${contentWord}"`);
          } else {
            break;
          }
        }
        
        if (wordsToRemove > 0) {
          contentWords = contentWords.slice(wordsToRemove);
          content = contentWords.join(' ');
          console.log(`🔧 After word-by-word removal: "${content.substring(0, 50)}..."`);
        }
        
        // STRATEGI 5: Ta bort separatorer från början
        content = content.replace(/^[-:.\s§\d\s,()•\-]*/, '').trim();
        console.log(`🔧 After separator removal: "${content.substring(0, 50)}..."`);
        
        // STRATEGI 6: Första meningen innehåller titelord
        const sentences = content.split(/[.!?]+/);
        if (sentences.length > 1) {
          const firstSentence = sentences[0].toLowerCase().trim();
          
          // Räkna hur många titelord som finns i första meningen
          const titleWordsInSentence = titleWords.filter((word: string) => 
            firstSentence.includes(word.toLowerCase())
          );
          
          if (titleWordsInSentence.length >= Math.min(2, titleWords.length)) {
            content = sentences.slice(1).join('.').trim();
            if (content.startsWith('.')) content = content.substring(1).trim();
            console.log(`🔧 Removed first sentence with ${titleWordsInSentence.length} title words`);
          }
        }
        
        // STRATEGI 7: Fallback om content blev för kort
        if (content.length < 30 && originalContent.length > 100) {
          console.log(`🔧 Content too short (${content.length}), using fallback`);
          content = originalContent;
          
          // Enkel rensning: bara paragrafnummer och första ord om det matchar
          content = content.replace(/^§\s*\d+\s*[-:.\s]*/, '').trim();
          
          const words = content.split(/\s+/);
          if (words.length > 1 && titleWords.length > 0) {
            const firstWord = words[0].toLowerCase().replace(/[^\w]/g, '');
            const firstTitleWord = titleWords[0].toLowerCase().replace(/[^\w]/g, '');
            
            if (firstWord === firstTitleWord || 
                (firstWord.length > 3 && firstTitleWord.length > 3 && 
                 (firstWord.includes(firstTitleWord) || firstTitleWord.includes(firstWord)))) {
              content = words.slice(1).join(' ').trim();
              console.log(`🔧 Fallback: removed first word "${words[0]}"`);
            }
          }
        }
        
        // SLUTLIG RENSNING
        content = content.replace(/^[-:.\s§\d\s,()•\-]*/, '').trim();
        
        // Säkerställ att content börjar med stor bokstav
        if (content.length > 0) {
          content = content.charAt(0).toUpperCase() + content.slice(1);
        }
        
        // Om content fortfarande är för kort, använd original utan paragrafnummer
        if (content.length < 20 && originalContent.length > 50) {
          content = originalContent.replace(/^§\s*\d+\s*[-:.\s]*/, '').trim();
          if (content.length > 0) {
            content = content.charAt(0).toUpperCase() + content.slice(1);
          }
        }
        
        console.log(`🔧 Final content start: "${content.substring(0, 100)}..."`);
        
        return {
          ...section,
          content: content
        };
      });

      // Spara analysen i databasen
      const { data: analysisData, error: analysisError } = await supabase
        .from('document_analyses')
        .insert({
          original_text: text.substring(0, 10000), // Begränsa storlek
          metadata: {
            ...metadata,
            analysis_time: new Date().toISOString(),
            model: "gpt-4o-mini",
            prompt_version: "2.6"
          },
          analysis_result: {
            sections: finalSections,
            summary: {
              total_sections: finalSections.length,
              avg_confidence: finalSections.reduce((sum: number, s: any) => sum + s.confidence, 0) / finalSections.length,
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
        sections: finalSections,
        summary: {
          total_sections: finalSections.length,
          avg_confidence: finalSections.reduce((sum: number, s: any) => sum + s.confidence, 0) / finalSections.length,
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