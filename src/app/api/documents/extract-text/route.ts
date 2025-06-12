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
          // Använd pdfjs-dist direkt istället för pdf-parse som har problem
          const pdfjsLib = await import('pdfjs-dist');
          
          // Konfigurera worker för server-side användning
          pdfjsLib.GlobalWorkerOptions.workerSrc = null;
          
          const pdfDoc = await pdfjsLib.getDocument({ 
            data: buffer,
            useSystemFonts: true,
            disableFontFace: true
          }).promise;
          
          metadata.totalPages = pdfDoc.numPages;
          
          let fullText = '';
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            try {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .filter((item: any) => item.str && typeof item.str === 'string')
                .map((item: any) => item.str.trim())
                .filter((str: string) => str.length > 0)
                .join(' ');
              
              if (pageText.trim()) {
                fullText += pageText + '\n\n';
              }
            } catch (pageError) {
              console.error(`Error processing page ${i}:`, pageError);
              // Fortsätt med nästa sida
            }
          }
          
          extractedText = fullText.trim();
          metadata.documentType = 'pdf_pdfjs';
          
          // Om ingen text extraherades, försök fallback
          if (!extractedText || extractedText.length < 10) {
            console.log('No meaningful text extracted from PDF, using fallback');
            extractedText = 'PDF-dokument uppladdad - textextraktion misslyckades. Manuell bearbetning krävs.';
            metadata.documentType = 'pdf_no_text';
          }
          
        } catch (pdfError) {
          console.error('PDF parsing with pdfjs failed:', pdfError);
          // Fallback: skapa en placeholder-text
          extractedText = 'PDF-dokument uppladdad - textextraktion misslyckades. Manuell bearbetning krävs.';
          metadata.documentType = 'pdf_fallback';
          metadata.totalPages = 1;
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

      // Rensa texten från problematiska Unicode-tecken
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