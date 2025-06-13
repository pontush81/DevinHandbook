# Snabb OCR-setup (5 minuter)

## 🚀 Aktivera automatisk OCR för scannade PDF:er

### Steg 1: Google Cloud Console (2 min)
1. Gå till [console.cloud.google.com](https://console.cloud.google.com/)
2. Skapa nytt projekt eller välj befintligt
3. Sök efter "Vision API" → Aktivera

### Steg 2: Service Account (2 min)
1. Gå till "IAM & Admin" → "Service Accounts"
2. "Create Service Account"
3. Namn: `handbook-ocr`
4. Roll: `Cloud Vision AI Service Agent`
5. "Create new key" → JSON → Ladda ner

### Steg 3: Miljövariabler (1 min)
Lägg till i `.env.local`:

```bash
GOOGLE_CLOUD_PROJECT_ID=ditt-projekt-id
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...hela JSON-filen...}
```

### Steg 4: Testa
1. Starta `npm run dev`
2. Ladda upp en scannad PDF
3. Se loggen: `✅ OCR slutförd: 1234 tecken`

## 💰 Kostnad
- **Första 1000 sidor/månad**: GRATIS
- **Typisk BRF-dokument (20 sidor)**: ~3 öre

## 🔧 Utan OCR
Systemet fungerar fortfarande utan OCR - användare får då hjälpfulla instruktioner för manuell konvertering.

## ❓ Problem?
Se [OCR_SETUP.md](./OCR_SETUP.md) för detaljerad felsökning. 