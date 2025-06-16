import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ocrService } from '@/lib/ocr-service';

// Initiera Supabase client med service role för server-side operationer
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Förbättrad PDF-textextraktion (utan problematiska beroenden)
async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
  let pages = 0;
  
  // Försök endast med pdf2json (hoppa över pdf-parse som har problem)
  try {
    console.log('Attempting PDF parsing with pdf2json...');
    const pdf2json = await import('pdf2json');
    const PDFParser = pdf2json.default;
    
    const pdfParser = new PDFParser();
    
    const parsePromise = new Promise<{ text: string; pages: number }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF parsing timeout after 30 seconds'));
      }, 30000); // 30 sekunder timeout för pdf2json
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        clearTimeout(timeout);
        reject(new Error(`PDF parsing error: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        clearTimeout(timeout);
        try {
          let text = '';
          const pages = pdfData.Pages || [];
          
          pages.forEach((page: any, pageIndex: number) => {
            if (page.Texts) {
              const pageTexts = page.Texts.map((textItem: any) => {
                return textItem.R?.map((run: any) => 
                  decodeURIComponent(run.T || '')
                ).join('') || '';
              }).filter((t: string) => t.trim()).join(' ');
              
              if (pageTexts.trim()) {
                text += `\n\n--- Sida ${pageIndex + 1} ---\n${pageTexts}`;
              }
            }
          });
          
          console.log(`PDF parsed with pdf2json: ${pages.length} pages, ${text.length} characters`);
          
          resolve({
            text: text.trim(),
            pages: pages.length
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
    
    pdfParser.parseBuffer(buffer);
    const result = await parsePromise;
    
    // Om vi fick text, returnera den
    if (result.text && result.text.trim().length > 50) {
      return result;
    }
    
    // Om ingen text hittades, försök med OCR
    console.log('PDF parsed but no meaningful text found - trying OCR...');
    
    if (ocrService.isAvailable()) {
      try {
        console.log('🤖 Försöker automatisk OCR med Google Cloud Vision...');
        const ocrResult = await ocrService.extractTextFromPDF(buffer);
        
        if (ocrResult.text && ocrResult.text.trim().length > 50) {
          console.log(`✅ OCR lyckades: ${ocrResult.text.length} tecken`);
          return {
            text: ocrResult.text,
            pages: result.pages
          };
        }
      } catch (ocrError) {
        console.error('❌ OCR misslyckades:', ocrError);
      }
    } else {
      console.log('⚠️ OCR inte tillgängligt - Google Cloud Vision API inte konfigurerat');
    }
    
    // Fallback: returnera hjälptext för scannad PDF
    const ocrStatus = ocrService.isAvailable() ? 'konfigurerat men misslyckades' : 'inte konfigurerat';
    
    return {
      text: `⚠️ SCANNAD PDF UPPTÄCKT - Textextraktion misslyckades

Detta verkar vara en scannad PDF-fil som innehåller bilder istället för text.

🔧 OCR-status: ${ocrStatus}

📋 För att analysera detta dokument kan du:

1. 🤖 Konfigurera automatisk OCR (rekommenderat):
   - Sätt upp Google Cloud Vision API
   - Lägg till GOOGLE_CLOUD_VISION_BUCKET i .env

2. 📄 Manuella alternativ:
   - Adobe Acrobat Pro (OCR-funktion)
   - Google Drive (ladda upp PDF:en, konverteras automatiskt)
   - Online OCR-verktyg: ocr.space eller onlineocr.net

3. 📁 Använd en textbaserad version av dokumentet

Filnamn: Uppladdad PDF
Antal sidor: ${result.pages}
Status: Scannad PDF, kräver OCR-behandling`,
      pages: result.pages
    };
    
  } catch (error) {
    console.error('PDF parsing failed:', error);
    
    // Fallback: returnera hjälptext utan att veta antal sidor
    return {
      text: `Detta verkar vara en scannad PDF-fil som innehåller bilder istället för text. För att kunna analysera detta dokument behöver du:

1. Konvertera PDF:en till en textbaserad version med hjälp av OCR-programvara
2. Eller kopiera texten manuellt från dokumentet  
3. Eller använda en annan version av dokumentet som innehåller sökbar text

Vanliga OCR-verktyg:
- Adobe Acrobat Pro (OCR-funktion)
- Google Drive (ladda upp PDF:en, den konverteras automatiskt)
- Online OCR-verktyg som ocr.space eller onlineocr.net

Filnamn: Uppladdad PDF
Antal sidor: Okänt`,
      pages: 1
    };
  }
}

// Extrahera text från Word-dokument
async function extractTextFromWord(buffer: Buffer): Promise<{ text: string; pages: number }> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      pages: Math.ceil(result.value.length / 3000) // Uppskatta antal sidor
    };
  } catch (error) {
    console.error('Word extraction error:', error);
    throw new Error('Misslyckades med att extrahera text från Word-dokument');
  }
}

// Extrahera text från textfil
async function extractTextFromPlainText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const text = buffer.toString('utf-8');
  return {
    text,
    pages: Math.ceil(text.length / 3000) // Uppskatta antal sidor
  };
}

// Extrahera text från bilder med OCR
async function extractTextFromImage(buffer: Buffer): Promise<{ text: string; pages: number }> {
  if (!ocrService.isAvailable()) {
    return {
      text: `Detta är en bildfil som innehåller text. För att kunna analysera detta dokument behöver du:

1. Konfigurera Google Cloud Vision API för automatisk OCR
2. Eller konvertera bilden till text manuellt
3. Eller använda online OCR-verktyg som ocr.space

Filtyp: Bildfil
OCR: Inte konfigurerat`,
      pages: 1
    };
  }

  try {
    console.log('🤖 Försöker automatisk OCR på bild med Google Cloud Vision...');
    const ocrResult = await ocrService.extractTextFromImage(buffer);
    
    if (ocrResult.text && ocrResult.text.trim().length > 10) {
      console.log(`✅ Bild-OCR lyckades: ${ocrResult.text.length} tecken`);
      return {
        text: ocrResult.text,
        pages: 1
      };
    } else {
      return {
        text: `Ingen text kunde hittas i denna bild. Kontrollera att:

1. Bilden innehåller tydlig text
2. Texten är läsbar och inte för suddig
3. Bilden har tillräcklig upplösning

Försök med en tydligare bild eller konvertera texten manuellt.`,
        pages: 1
      };
    }
  } catch (ocrError) {
    console.error('❌ Bild-OCR misslyckades:', ocrError);
    return {
      text: `OCR-bearbetning av bilden misslyckades. Fel: ${ocrError instanceof Error ? ocrError.message : 'Okänt fel'}

För att analysera denna bild kan du:
1. Kontrollera Google Cloud Vision API-konfigurationen
2. Försök med en tydligare bild
3. Konvertera texten manuellt`,
      pages: 1
    };
  }
}

// Extrahera text från andra filtyper
async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<{ text: string; pages?: number }> {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(buffer);
  }
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType === 'application/msword') {
    return await extractTextFromWord(buffer);
  }
  
  if (mimeType.startsWith('image/') || 
      mimeType === 'image/jpeg' || 
      mimeType === 'image/jpg' || 
      mimeType === 'image/png' || 
      mimeType === 'image/gif' || 
      mimeType === 'image/webp') {
    return await extractTextFromImage(buffer);
  }
  
  if (mimeType.startsWith('text/') || mimeType === 'text/plain') {
    return await extractTextFromPlainText(buffer);
  }
  
  throw new Error(`Filtyp ${mimeType} stöds inte för textextraktion`);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileId = formData.get('fileId') as string;
    
    if (!fileId) {
      return NextResponse.json({ error: 'Fil-ID saknas' }, { status: 400 });
    }
    
    console.log(`Starting text extraction for file ID: ${fileId}`);
    
    // Hämta filinformation från databasen
    const { data: fileRecord, error: dbError } = await supabase
      .from('document_imports')
      .select('*')
      .eq('id', fileId)
      .single();
    
    if (dbError || !fileRecord) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Fil hittades inte' }, { status: 404 });
    }
    
    console.log(`File record found: ${fileRecord.file_name}`);
    
    // Ladda ner filen från Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('document_imports')
      .download(fileRecord.storage_path);
    
    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return NextResponse.json({ error: 'Misslyckades med att ladda ner fil' }, { status: 500 });
    }
    
    console.log(`File downloaded successfully: ${fileData.size} bytes`);
    
    // Konvertera till Buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Extrahera text med timeout (längre för OCR-operationer)
    const extractionPromise = extractTextFromFile(buffer, fileRecord.file_type);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Textextraktion tog för lång tid')), 120000); // 2 minuter timeout för OCR
    });
    
    const extractionResult = await Promise.race([extractionPromise, timeoutPromise]);
    
    console.log(`Text extraction completed: ${extractionResult.text.length} characters`);
    
    // Uppdatera databasen med extraherad text
    const updateData = {
      status: 'text_extracted',
      extracted_text: extractionResult.text,
      metadata: {
        ...fileRecord.metadata,
        extraction: {
          method: extractionResult.text.includes('Detta verkar vara en scannad PDF') ? 'fallback' : 'success',
          text_length: extractionResult.text.length,
          pages: extractionResult.pages,
          extracted_at: new Date().toISOString()
        }
      },
      updated_at: new Date().toISOString()
    };
    
    console.log(`Attempting to update database with extracted text length: ${extractionResult.text.length}`);
    
    const { data: updatedRecord, error: updateError } = await supabase
      .from('document_imports')
      .update(updateData)
      .eq('id', fileId)
      .select();
    
    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Misslyckades med att uppdatera databasen' }, { status: 500 });
    }
    
    console.log('Database update successful:', updatedRecord);
    
    return NextResponse.json({
      success: true,
      fileId,
      text: extractionResult.text,
      extractedText: extractionResult.text,
      textLength: extractionResult.text.length,
      pages: extractionResult.pages,
      metadata: {
        title: fileRecord.file_name,
        pages: extractionResult.pages,
        textLength: extractionResult.text.length,
        extractionMethod: extractionResult.text.includes('Detta verkar vara en scannad PDF') ? 'fallback' : 'success'
      }
    });
    
  } catch (error) {
    console.error('Text extraction error:', error);
    return NextResponse.json({ 
      error: `Textextraktion misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}` 
    }, { status: 500 });
  }
} 