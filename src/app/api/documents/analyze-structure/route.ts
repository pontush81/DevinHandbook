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

    if (!text || !metadata || !documentId) {
      return NextResponse.json({ error: 'Text, metadata och documentId krävs' }, { status: 400 });
    }

    // Skapa analyze_job i analyze_jobs-tabellen
    const { data, error } = await supabase
      .from('analyze_jobs')
      .insert({
        user_id: userId || null,
        document_id: documentId,
        status: 'pending',
        result: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Kunde inte skapa analyze-jobb', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobId: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: 'Ett oväntat fel inträffade', details: error.message }, { status: 500 });
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