# Automatiserad OCR-konfiguration

## Översikt
Systemet stöder nu automatiserad OCR (Optical Character Recognition) för scannade PDF-dokument med hjälp av Google Cloud Vision API. Detta gör att användare kan ladda upp scannade dokument som automatiskt konverteras till text utan manuell intervention.

## Fördelar med automatiserad OCR
- ✅ **Sömlös användarupplevelse** - Inga manuella steg krävs
- ✅ **Hög kvalitet** - Google Cloud Vision har excellent stöd för svenska
- ✅ **Snabb bearbetning** - 2-5 sekunder per dokument
- ✅ **Kostnadseffektiv** - ~$1.50 per 1000 sidor
- ✅ **Skalbar** - Hanterar stora volymer automatiskt

## Konfiguration

### 1. Skapa Google Cloud-projekt
1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Skapa ett nytt projekt eller välj befintligt
3. Aktivera Vision API:
   - Gå till "APIs & Services" → "Library"
   - Sök efter "Cloud Vision API"
   - Klicka "Enable"

### 2. Skapa Service Account
1. Gå till "IAM & Admin" → "Service Accounts"
2. Klicka "Create Service Account"
3. Namn: `handbook-ocr-service`
4. Beskrivning: `OCR service for handbook document processing`
5. Klicka "Create and Continue"
6. Lägg till roll: `Cloud Vision AI Service Agent`
7. Klicka "Done"

### 3. Generera API-nyckel
1. Klicka på den skapade service account
2. Gå till "Keys"-fliken
3. Klicka "Add Key" → "Create new key"
4. Välj "JSON"
5. Ladda ner filen (spara säkert!)

### 4. Konfigurera miljövariabler
Lägg till följande i din `.env.local`:

```bash
# Google Cloud Vision API för OCR
GOOGLE_CLOUD_PROJECT_ID=ditt-projekt-id
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"ditt-projekt-id",...}
```

**VIKTIGT**: `GOOGLE_CLOUD_CREDENTIALS` ska vara hela JSON-innehållet från den nedladdade nyckelfilen, på en rad.

### 5. Testa konfigurationen
Starta utvecklingsservern och ladda upp en scannad PDF. Du bör se i loggen:
```
✅ Google Cloud Vision API konfigurerad
🔍 Startar OCR-bearbetning med Google Cloud Vision...
✅ OCR slutförd: 1234 tecken, confidence: 0.95
```

## Kostnad och användning

### Prissättning (Google Cloud Vision)
- **Första 1000 sidor/månad**: Gratis
- **Därefter**: ~$1.50 per 1000 sidor
- **Typisk BRF-stadgar (20 sidor)**: ~$0.03

### Användningsexempel
- **Liten BRF (10 dokument/månad)**: ~$0.30/månad
- **Medelstor BRF (50 dokument/månad)**: ~$1.50/månad  
- **Stor BRF (200 dokument/månad)**: ~$6/månad

## Fallback-beteende
Om OCR inte är konfigurerat eller misslyckas:
1. Systemet försöker extrahera text med pdf2json
2. Om ingen text hittas, visas hjälpfulla instruktioner för manuell OCR
3. Användaren kan fortfarande skapa handbok med placeholder-sektioner

## Säkerhet
- Service account-nycklar lagras säkert i miljövariabler
- Inga dokument sparas permanent i Google Cloud
- All kommunikation sker över HTTPS
- Följer GDPR-riktlinjer för databehandling

## Felsökning

### "OCR-tjänsten är inte konfigurerad"
- Kontrollera att `GOOGLE_CLOUD_PROJECT_ID` och `GOOGLE_CLOUD_CREDENTIALS` är satta
- Verifiera att JSON-formatet är korrekt (ingen radbrytning)

### "OCR-bearbetning misslyckades"
- Kontrollera att Vision API är aktiverat i Google Cloud Console
- Verifiera att service account har rätt behörigheter
- Kontrollera internetanslutning

### "PDF parsing timeout"
- Öka timeout-värdet i `extractTextFromPDF`
- Kontrollera att PDF:en inte är korrupt
- Försök med mindre PDF-filer först

## Alternativa OCR-tjänster
Om Google Cloud Vision inte passar kan systemet enkelt utökas med:
- **Azure Computer Vision** - Bra för nordiska språk
- **AWS Textract** - Bra för strukturerade dokument
- **Tesseract.js** - Gratis men långsammare (redan testat, för långsamt)

## Utveckling och utökning
OCR-tjänsten är modulär och kan enkelt utökas:
- Stöd för flera sidor samtidigt
- Batch-bearbetning av dokument
- Olika OCR-leverantörer baserat på dokumenttyp
- Caching av OCR-resultat 