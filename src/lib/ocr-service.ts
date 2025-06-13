import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// OCR Service för automatisk textextraktion från scannade dokument
export class OCRService {
  private client: ImageAnnotatorClient | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Försök först med miljövariabler
      const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

      if (credentials && projectId) {
        try {
          const parsedCredentials = JSON.parse(credentials);
          this.client = new ImageAnnotatorClient({
            credentials: parsedCredentials,
            projectId: projectId
          });
          this.isConfigured = true;
          console.log('✅ Google Cloud Vision API konfigurerad via miljövariabler');
          return;
        } catch (parseError) {
          console.log('⚠️ Kunde inte parsa GOOGLE_CLOUD_CREDENTIALS från miljövariabel, försöker med fil...');
        }
      }

      // Fallback: försök läsa från fil
      const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        const fileCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        this.client = new ImageAnnotatorClient({
          keyFilename: credentialsPath
        });
        this.isConfigured = true;
        console.log('✅ Google Cloud Vision API konfigurerad via fil: google-credentials.json');
        return;
      }

      console.log('⚠️ Google Cloud Vision API inte konfigurerad - OCR inaktiverat');
      console.log('💡 För att aktivera OCR:');
      console.log('   1. Sätt GOOGLE_CLOUD_CREDENTIALS miljövariabel, eller');
      console.log('   2. Placera google-credentials.json i projektets root');

    } catch (error) {
      console.error('❌ Fel vid konfiguration av Google Cloud Vision API:', error);
    }
  }

  async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; confidence: number; pages: number }> {
    if (!this.isConfigured || !this.client) {
      throw new Error('OCR-tjänsten är inte konfigurerad');
    }

    const execAsync = promisify(exec);
    let tempPdfPath: string | null = null;
    let tempImagePath: string | null = null;

    // Kontrollera och skapa temp-mapp om den inte finns
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      console.log('🔍 Startar OCR-bearbetning med Google Cloud Vision...');
      
      // Skapa temporära filer
      const timestamp = Date.now();
      tempPdfPath = path.join(tempDir, `pdf_${timestamp}.pdf`);
      tempImagePath = path.join(tempDir, `page_${timestamp}.png`);
      
      // Spara PDF till temporär fil
      console.log('📄 Sparar PDF till temporär fil...');
      fs.writeFileSync(tempPdfPath, buffer);
      
      // Konvertera alla sidor med ImageMagick direkt
      console.log('🖼️ Konverterar alla PDF-sidor till bilder med ImageMagick...');
      const magickCommand = `magick "${tempPdfPath}" -density 200 -quality 100 "${tempDir}/page_${timestamp}_%d.png"`;
      console.log('🔧 ImageMagick kommando:', magickCommand);
      
      await execAsync(magickCommand);
      
      // Hitta alla skapade bilder
      const imageFiles = fs.readdirSync(tempDir)
        .filter(file => file.startsWith(`page_${timestamp}_`) && file.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/page_\d+_(\d+)\.png/)?.[1] || '0');
          const numB = parseInt(b.match(/page_\d+_(\d+)\.png/)?.[1] || '0');
          return numA - numB;
        });
      
      console.log(`📄 Hittade ${imageFiles.length} sidor att bearbeta`);
      
      if (imageFiles.length === 0) {
        throw new Error('ImageMagick kunde inte skapa några bildfiler');
      }

      // Bearbeta alla sidor med OCR
      let allText = '';
      let totalConfidence = 0;
      let processedPages = 0;
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        const imagePath = path.join(tempDir, imageFile);
        
        console.log(`🔍 Bearbetar sida ${i + 1}/${imageFiles.length}: ${imageFile}`);
        
        try {
          const imageBuffer = fs.readFileSync(imagePath);
          
          // Extrahera text från bilden
          const [result] = await this.client.documentTextDetection({
            image: {
              content: imageBuffer.toString('base64')
            }
          });

          const fullTextAnnotation = result.fullTextAnnotation;
          
          if (fullTextAnnotation && fullTextAnnotation.text) {
            const pageText = fullTextAnnotation.text.trim();
            if (pageText.length > 0) {
              allText += (allText ? '\n\n--- Sida ' + (i + 1) + ' ---\n\n' : '') + pageText;
              totalConfidence += this.calculateAverageConfidence(fullTextAnnotation);
              processedPages++;
            }
          }
          
          // Rensa bildfil direkt efter bearbetning
          fs.unlinkSync(imagePath);
          
        } catch (pageError) {
          console.warn(`⚠️ Kunde inte bearbeta sida ${i + 1}:`, pageError);
        }
      }
      
      const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;
      
      console.log(`✅ OCR slutförd: ${allText.length} tecken från ${processedPages} sidor, confidence: ${averageConfidence.toFixed(2)}`);

      return {
        text: allText,
        confidence: averageConfidence,
        pages: processedPages
      };

    } catch (error) {
      console.error('❌ OCR-fel:', error);
      throw new Error(`OCR-bearbetning misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`);
    } finally {
      // Rensa temporära filer
      try {
        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
        
        // Rensa eventuella kvarvarande bildfiler
        if (fs.existsSync('./temp')) {
          const remainingFiles = fs.readdirSync('./temp')
            .filter(file => file.includes(`${Date.now()}`) || file.startsWith('page_'));
          
          for (const file of remainingFiles) {
            try {
              fs.unlinkSync(path.join('./temp', file));
            } catch (fileError) {
              // Ignorera fel för enskilda filer
            }
          }
        }
      } catch (cleanupError) {
        console.warn('⚠️ Kunde inte rensa temporära filer:', cleanupError);
      }
    }
  }

  private calculateAverageConfidence(annotation: any): number {
    if (!annotation.pages || annotation.pages.length === 0) {
      return 0.5; // Default confidence
    }

    let totalConfidence = 0;
    let wordCount = 0;

    for (const page of annotation.pages) {
      if (page.blocks) {
        for (const block of page.blocks) {
          if (block.paragraphs) {
            for (const paragraph of block.paragraphs) {
              if (paragraph.words) {
                for (const word of paragraph.words) {
                  if (word.confidence !== undefined) {
                    totalConfidence += word.confidence;
                    wordCount++;
                  }
                }
              }
            }
          }
        }
      }
    }

    return wordCount > 0 ? totalConfidence / wordCount : 0.5;
  }

  async extractTextFromImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    if (!this.isConfigured || !this.client) {
      throw new Error('OCR-tjänsten är inte konfigurerad');
    }

    try {
      console.log('🔍 Startar OCR-bearbetning av bild med Google Cloud Vision...');
      
      // Extrahera text från bilden direkt
      const [result] = await this.client.documentTextDetection({
        image: {
          content: buffer.toString('base64')
        }
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      
      if (fullTextAnnotation && fullTextAnnotation.text) {
        const text = fullTextAnnotation.text.trim();
        const confidence = this.calculateAverageConfidence(fullTextAnnotation);
        
        console.log(`✅ Bild-OCR slutförd: ${text.length} tecken, confidence: ${confidence.toFixed(2)}`);
        
        return {
          text: text,
          confidence: confidence
        };
      } else {
        console.log('⚠️ Ingen text hittades i bilden');
        return {
          text: '',
          confidence: 0
        };
      }

    } catch (error) {
      console.error('❌ Bild-OCR fel:', error);
      throw new Error(`Bild-OCR misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`);
    }
  }

  isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      return false;
    }

    try {
      // Testa med en minimal bild
      const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
      
      await this.client.textDetection({
        image: { content: testImage.toString('base64') }
      });
      
      return true;
    } catch (error) {
      console.error('OCR-anslutningstest misslyckades:', error);
      return false;
    }
  }
}

// Singleton instance
export const ocrService = new OCRService(); 