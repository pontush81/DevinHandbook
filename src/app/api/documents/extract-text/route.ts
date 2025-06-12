import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initiera Supabase client med service role för server-side operationer
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'FileId krävs' }, { status: 400 });
    }

    // Hämta filmetadata från databasen
    const { data: fileData, error: dbError } = await supabase
      .from('document_imports')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError || !fileData) {
      return NextResponse.json({ error: 'Fil hittades inte' }, { status: 404 });
    }

    // Ladda ner filen från storage
    const { data: fileBuffer, error: downloadError } = await supabase.storage
      .from('document_imports')
      .download(fileData.storage_path);

    if (downloadError || !fileBuffer) {
      return NextResponse.json({ error: 'Kunde inte ladda ner filen' }, { status: 500 });
    }

    let extractedText = '';
    let metadata = { totalPages: 0, language: 'sv', documentType: 'unknown' };

    try {
      // Konvertera Blob till Buffer
      const buffer = Buffer.from(await fileBuffer.arrayBuffer());

      if (fileData.file_type === 'application/pdf') {
        try {
          // Använd pdf2json som är mer stabil för server-side användning
          const PDFParser = await import('pdf2json');
          
          console.log('Attempting PDF parsing with pdf2json...');
          
          // Skapa en Promise för att hantera pdf2json's callback-baserade API
          const pdfData = await new Promise<{ text: string; pages: number }>((resolve, reject) => {
            const pdfParser = new PDFParser.default(null, 1);
            
            let extractedText = '';
            let pageCount = 0;
            
            pdfParser.on('pdfParser_dataError', (errData: any) => {
              console.error('PDF parsing error:', errData.parserError);
              reject(new Error(errData.parserError));
            });
            
            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              try {
                pageCount = pdfData.Pages ? pdfData.Pages.length : 0;
                
                // Extrahera text från alla sidor
                if (pdfData.Pages) {
                  for (const page of pdfData.Pages) {
                    if (page.Texts) {
                      for (const textObj of page.Texts) {
                        if (textObj.R) {
                          for (const textRun of textObj.R) {
                            if (textRun.T) {
                              // Dekoda URI-kodad text
                              const decodedText = decodeURIComponent(textRun.T);
                              extractedText += decodedText + ' ';
                            }
                          }
                        }
                      }
                    }
                    extractedText += '\n\n'; // Lägg till radbrytning mellan sidor
                  }
                }
                
                resolve({ 
                  text: extractedText.trim(), 
                  pages: pageCount 
                });
              } catch (parseError) {
                reject(parseError);
              }
            });
            
            // Starta parsing
            pdfParser.parseBuffer(buffer);
          });
          
          extractedText = pdfData.text;
          metadata.totalPages = pdfData.pages;
          metadata.documentType = 'pdf_json_parsed';
          
          console.log(`PDF parsed successfully: ${pdfData.pages} pages, ${extractedText.length} characters`);
          
          // Rensa och validera extraherad text
          if (extractedText && extractedText.trim().length > 10) {
            // Rensa texten från problematiska tecken
            extractedText = extractedText
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // Ersätt kontrolltecken med mellanslag
              .replace(/[\uFFFE\uFFFF]/g, '') // Ta bort ogiltiga Unicode-tecken
              .replace(/\s+/g, ' ') // Normalisera mellanslag
              .trim();
          } else {
            console.log('PDF parsed but no meaningful text found');
            extractedText = '';
          }
          
        } catch (pdfError) {
          console.error('PDF parsing with pdf2json failed:', pdfError);
          extractedText = '';
          metadata.documentType = 'pdf_parse_failed';
        }
        
        // Om PDF-parsing misslyckades eller gav för lite text, använd fallback
        if (!extractedText || extractedText.length < 10) {
          console.log('Using fallback text for PDF');
          extractedText = 'PDF-dokument uppladdad - textextraktion misslyckades. Manuell bearbetning krävs.';
          metadata.documentType = 'pdf_fallback';
          metadata.totalPages = metadata.totalPages || 1;
        }
      } 
      else if (fileData.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Dynamisk import för att undvika build-problem
        const mammoth = await import('mammoth');
        const docxData = await mammoth.extractRawText({ buffer });
        extractedText = docxData.value;
        metadata.documentType = 'docx';
      }
      else if (fileData.file_type === 'application/msword') {
        // För .doc filer - försök med mammoth ändå
        try {
          const mammoth = await import('mammoth');
          const docData = await mammoth.extractRawText({ buffer });
          extractedText = docData.value;
          metadata.documentType = 'doc';
        } catch {
          // Fallback för gamla .doc filer
          extractedText = buffer.toString('utf-8');
          metadata.documentType = 'doc_fallback';
        }
      }
      else if (fileData.file_type === 'text/plain') {
        extractedText = buffer.toString('utf-8');
        metadata.documentType = 'text';
      }

      if (!extractedText.trim()) {
        await supabase
          .from('document_imports')
          .update({ 
            status: 'extraction_failed',
            error_message: 'Ingen text kunde extraheras från dokumentet'
          })
          .eq('id', fileId);

        return NextResponse.json({ 
          error: 'Ingen text kunde extraheras från dokumentet' 
        }, { status: 400 });
      }

      // Slutlig rensning av texten
      extractedText = extractedText
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Ta bort kontrolltecken
        .replace(/[\uFFFE\uFFFF]/g, '') // Ta bort ogiltiga Unicode-tecken
        .trim();

      // Uppdatera databasen med extraherad text
      console.log('Attempting to update database with extracted text length:', extractedText.length);
      
      const { data: updateData, error: updateError } = await supabase
        .from('document_imports')
        .update({ 
          status: 'text_extracted',
          extracted_text: extractedText,
          metadata: {
            ...fileData.metadata,
            extraction: {
              ...metadata,
              wordCount: extractedText.split(/\s+/).length,
              characterCount: extractedText.length,
              extractedAt: new Date().toISOString()
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId)
        .select();

      if (updateError) {
        console.error('Fel vid uppdatering av databas:', updateError);
        return NextResponse.json({ 
          error: 'Kunde inte spara extraherad text: ' + updateError.message 
        }, { status: 500 });
      }

      console.log('Database update successful:', updateData);

      return NextResponse.json({ 
        success: true,
        text: extractedText,
        metadata,
        title: fileData.file_name.replace(/\.[^/.]+$/, ""), // Ta bort filextension
        totalPages: metadata.totalPages,
        language: metadata.language,
        documentType: metadata.documentType
      });

    } catch (extractionError) {
      console.error('Fel vid textextraktion:', extractionError);
      
      await supabase
        .from('document_imports')
        .update({ 
          status: 'extraction_failed',
          error_message: extractionError instanceof Error ? extractionError.message : 'Okänt fel'
        })
        .eq('id', fileId);

      return NextResponse.json({ 
        error: 'Kunde inte extrahera text från dokumentet' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Oväntat fel:', error);
    return NextResponse.json({ 
      error: 'Ett oväntat fel inträffade' 
    }, { status: 500 });
  }
} 