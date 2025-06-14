import { OcrJobUploader } from '@/components/ocr/OcrJobUploader';

export default function OcrTestPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <h1>Testa PDF-OCR</h1>
      <OcrJobUploader />
    </div>
  );
} 