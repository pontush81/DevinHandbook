import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const OcrJobUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult('');
      setError('');
      setStatus('');
    }
  };

  const uploadAndStartJob = async () => {
    setError('');
    setStatus('');
    setResult('');
    setIsUploading(true);
    setCopied(false);
    if (!file) return;
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storagePath = `ocr_uploads/${timestamp}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('handbook_files')
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw new Error('Kunde inte ladda upp PDF: ' + uploadError.message);

      setStatus('Jobb skapas...');
      const res = await fetch('/api/ocr/start-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: storagePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte starta OCR-jobb');
      setJobId(data.job_id);
      setStatus('OCR pågår...');
      pollJobStatus(data.job_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    let done = false;
    setStatus('OCR pågår...');
    while (!done) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/ocr/job/${id}`);
      const data = await res.json();
      setStatus(data.status === 'done' ? 'Klar!' : data.status === 'error' ? 'Fel' : 'OCR pågår...');
      if (data.status === 'done') {
        setResult(data.result);
        done = true;
      } else if (data.status === 'error') {
        setError(data.error_message || 'OCR misslyckades');
        done = true;
      }
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: 8,
      padding: 24,
      background: '#fafbfc',
      boxShadow: '0 2px 8px #0001'
    }}>
      <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Välj PDF-fil:</label>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button
        onClick={uploadAndStartJob}
        disabled={!file || isUploading}
        style={{
          marginLeft: 12,
          padding: '6px 18px',
          background: '#3498db',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: isUploading ? 'not-allowed' : 'pointer'
        }}
      >
        {isUploading ? 'Laddar upp...' : 'Starta OCR-jobb'}
      </button>
      {status && <p style={{ marginTop: 16, fontWeight: 500 }}>{status}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 600 }}>Resultat:</label>
          <textarea
            value={result}
            readOnly
            style={{ width: '100%', minHeight: 180, marginTop: 8, fontFamily: 'monospace' }}
          />
          <button
            onClick={handleCopy}
            style={{
              marginTop: 8,
              padding: '4px 12px',
              background: '#2ecc71',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {copied ? 'Kopierat!' : 'Kopiera text'}
          </button>
        </div>
      )}
      {error && <p style={{ color: 'red', marginTop: 16 }}>{error}</p>}
    </div>
  );
}; 