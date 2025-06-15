import dotenv from 'dotenv';
dotenv.config();
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('GOOGLE_CLOUD_VISION_BUCKET:', process.env.GOOGLE_CLOUD_VISION_BUCKET);
console.log('SUPABASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET);
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import vision from '@google-cloud/vision';
import * as fs from "fs";
import * as path from "path";

// Skriv credentials till en temporär fil om variabeln finns
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const credsPath = path.join("/tmp", "google-credentials.json");
  fs.writeFileSync(credsPath, process.env.GOOGLE_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const visionClient = new vision.ImageAnnotatorClient();
const gcsBucket = process.env.GOOGLE_CLOUD_VISION_BUCKET!;
const supabaseStorageBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'documents';

async function pollAndProcessJobs() {
  while (true) {
    try {
      // Hämta första pending-jobbet
      const { data: jobs, error } = await supabase
        .from('ocr_jobs')
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
      console.log(`[OCR Worker] Bearbetar jobb ${job.id}`);
      // Sätt status till processing
      await supabase.from('ocr_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);
      // Hämta PDF från Supabase Storage
      const { data: fileData, error: fileError } = await supabase.storage.from(supabaseStorageBucket).download(job.file_path);
      if (fileError || !fileData) throw new Error('Kunde inte hämta PDF från Supabase Storage');
      // Spara till temporär fil
      const tempPath = path.join('/tmp', `${uuidv4()}.pdf`);
      const fileBuffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync(tempPath, fileBuffer);
      // Ladda upp till GCS för Vision
      const gcsInputPath = `ocr-input/${job.id}.pdf`;
      await new Storage().bucket(gcsBucket).upload(tempPath, { destination: gcsInputPath });
      // Starta Vision OCR-jobb
      const [operation] = await visionClient.asyncBatchAnnotateFiles({
        requests: [{
          inputConfig: {
            gcsSource: { uri: `gs://${gcsBucket}/${gcsInputPath}` },
            mimeType: 'application/pdf',
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          outputConfig: {
            gcsDestination: { uri: `gs://${gcsBucket}/ocr-output/${job.id}/` },
          },
        }],
      });
      // Vänta på att jobbet är klart
      const [filesResponse] = await operation.promise();
      // Hämta OCR-resultat från GCS
      const [files] = await new Storage().bucket(gcsBucket).getFiles({ prefix: `ocr-output/${job.id}/` });
      let fullText = '';
      for (const file of files) {
        const contents = (await file.download())[0].toString('utf8');
        const json = JSON.parse(contents);
        for (const resp of json.responses) {
          if (resp.fullTextAnnotation && resp.fullTextAnnotation.text) {
            fullText += resp.fullTextAnnotation.text + '\n';
          }
        }
      }
      // Uppdatera jobb med resultat
      await supabase.from('ocr_jobs').update({ status: 'done', result: fullText, updated_at: new Date().toISOString() }).eq('id', job.id);
      // Rensa temporära filer
      fs.unlinkSync(tempPath);
      // (Valfritt: rensa GCS-filer)
      console.log(`[OCR Worker] Klart: ${job.id}`);
    } catch (err: any) {
      console.error('[OCR Worker] Fel:', err.message);
      if (err.jobId) {
        await supabase.from('ocr_jobs').update({ status: 'error', error_message: err.message, updated_at: new Date().toISOString() }).eq('id', err.jobId);
      }
      await sleep(10000);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

pollAndProcessJobs(); 