import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/ocr-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing OCR configuration...');
    
    // Kontrollera om OCR-tjänsten är tillgänglig
    const isAvailable = ocrService.isAvailable();
    console.log(`OCR Service available: ${isAvailable}`);
    
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        message: 'OCR-tjänsten är inte konfigurerad',
        details: 'GOOGLE_CLOUD_PROJECT_ID eller GOOGLE_CLOUD_CREDENTIALS saknas',
        fallback: 'Systemet fungerar fortfarande utan OCR'
      });
    }
    
    // Testa anslutningen till Google Cloud Vision API
    console.log('🔍 Testing Google Cloud Vision API connection...');
    const connectionTest = await ocrService.testConnection();
    
    if (connectionTest) {
      console.log('✅ OCR connection test successful!');
      return NextResponse.json({
        success: true,
        message: 'OCR-tjänsten är korrekt konfigurerad och fungerar!',
        details: 'Google Cloud Vision API anslutning lyckades',
        ready: true
      });
    } else {
      console.log('❌ OCR connection test failed');
      return NextResponse.json({
        success: false,
        message: 'OCR-tjänsten är konfigurerad men anslutningen misslyckades',
        details: 'Kontrollera Google Cloud credentials och API-aktivering',
        configured: true,
        connected: false
      });
    }
    
  } catch (error) {
    console.error('❌ OCR test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Fel vid test av OCR-tjänsten',
      error: error instanceof Error ? error.message : 'Okänt fel',
      details: 'Se server-loggen för mer information'
    }, { status: 500 });
  }
} 