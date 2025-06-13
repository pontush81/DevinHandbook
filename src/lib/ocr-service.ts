import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

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

    try {
      console.log('🔍 Startar OCR-bearbetning av PDF med Google Cloud Vision (direkt på PDF)...');

      // Skicka PDF direkt till Google Vision API
      const [operation] = await this.client.asyncBatchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              content: buffer.toString('base64'),
              mimeType: 'application/pdf',
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            outputConfig: {
              gcsDestination: {
                uri: `gs://${process.env.GOOGLE_CLOUD_VISION_BUCKET}/ocr-output-${Date.now()}/`,
              },
              batchSize: 5,
            },
          },
        ],
      });

      // Vänta på att operationen är klar
      const [filesResponse] = await operation.promise();
      const responses = filesResponse.responses || [];
      let allText = '';
      let totalConfidence = 0;
      let processedPages = 0;

      for (const response of responses) {
        if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
          const pageText = response.fullTextAnnotation.text.trim();
          if (pageText.length > 0) {
            allText += (allText ? '\n\n--- Sida ' + (processedPages + 1) + ' ---\n\n' : '') + pageText;
            totalConfidence += this.calculateAverageConfidence(response.fullTextAnnotation);
            processedPages++;
          }
        }
      }

      const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;
      console.log(`✅ OCR slutförd: ${allText.length} tecken från ${processedPages} sidor, confidence: ${averageConfidence.toFixed(2)}`);

      return {
        text: allText,
        confidence: averageConfidence,
        pages: processedPages,
      };
    } catch (error) {
      console.error('❌ OCR-fel:', error);
      throw new Error(`OCR-bearbetning misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}`);
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