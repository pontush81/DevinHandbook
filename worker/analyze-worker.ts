import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function pollAndProcessAnalyzeJobs() {
  while (true) {
    try {
      // Hämta första pending-jobbet
      const { data: jobs, error } = await supabase
        .from('analyze_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      if (!jobs || jobs.length === 0) {
        await sleep(5000);
        continue;
      }
      const job = jobs[0];
      console.log(`[ANALYZE Worker] Bearbetar jobb ${job.id}`);
      // Sätt status till processing
      await supabase.from('analyze_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);
      // Hämta dokumenttext och metadata från document_imports
      const { data: doc, error: docError } = await supabase
        .from('document_imports')
        .select('extracted_text, metadata, file_name')
        .eq('id', job.document_id)
        .single();
      if (docError || !doc) throw new Error('Kunde inte hämta dokumenttext');
      const text = doc.extracted_text;
      const metadata = doc.metadata || {};
      // Bygg prompt och kör OpenAI
      const systemPrompt = 'Du är en expert handboksförfattare som skapar digitala handböcker. Din uppgift är att analysera ett dokument och strukturera det för att skapa en användbar digital handbok.';
      const userPrompt = `Analysera dokumentet nedan och skapa sektioner som är logiska och användbara för läsare av en digital handbok.\n\nDOKUMENTINFORMATION:\n- Titel: ${doc.file_name}\n- Metadata: ${JSON.stringify(metadata)}\n\nDOKUMENT:\n${text}`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      });
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) throw new Error('Ingen respons från AI-analysen');
      let analysisResult;
      try {
        analysisResult = JSON.parse(responseContent);
      } catch (parseError) {
        throw new Error('Kunde inte tolka AI-responsen');
      }
      // Uppdatera analyze_job med resultat
      await supabase.from('analyze_jobs').update({
        status: 'done',
        result: analysisResult,
        updated_at: new Date().toISOString(),
        error_message: null
      }).eq('id', job.id);
      console.log(`[ANALYZE Worker] Klart: ${job.id}`);
    } catch (err: any) {
      console.error('[ANALYZE Worker] Fel:', err.message);
      if (err.jobId) {
        await supabase.from('analyze_jobs').update({ status: 'error', error_message: err.message, updated_at: new Date().toISOString() }).eq('id', err.jobId);
      }
      await sleep(10000);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

pollAndProcessAnalyzeJobs(); 