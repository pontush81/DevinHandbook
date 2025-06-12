# Smart handboksimport med AI

## Översikt

Den smarta import-funktionen gör det möjligt för användare att ladda upp befintliga handböcker i olika format (PDF, Word, textfiler) och automatiskt konvertera dem till strukturerade handböcker i systemet med hjälp av AI.

## Funktioner

### Stöd för flera filformat
- **PDF-filer** - Textextraktion med pdf-parse
- **Word-dokument (.docx)** - Textextraktion med mammoth  
- **Äldre Word-filer (.doc)** - Begränsad support med fallback
- **Textfiler (.txt)** - Direkt import

### AI-driven strukturanalys
- Använder OpenAI GPT-4o-mini för att analysera dokumentstruktur
- Identifierar rubriker och sektioner automatiskt
- Mappar innehåll till standardmall för BRF-handböcker
- Ger confidence-poäng för varje mappning

### Säker filhantering
- 10MB maximal filstorlek
- Temporär lagring i Supabase Storage
- Automatisk cleanup av temporära filer
- Row Level Security (RLS) för databasåtkomst

## Teknisk implementation

### Databasstruktur

#### document_imports
```sql
CREATE TABLE document_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### document_analyses  
```sql
CREATE TABLE document_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_text TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    analysis_result JSONB NOT NULL DEFAULT '{}',
    template_type TEXT NOT NULL DEFAULT 'brf',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

#### POST /api/documents/upload
Laddar upp dokument till temporär lagring.

**Request:**
- Form data med fil

**Response:**
```json
{
  "success": true,
  "fileId": "uuid",
  "fileName": "dokument.pdf",
  "fileSize": 1024,
  "fileType": "application/pdf"
}
```

#### POST /api/documents/extract-text
Extraherar text från uppladdad fil.

**Request:**
```json
{
  "fileId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "text": "Extraherad text...",
  "metadata": {
    "totalPages": 10,
    "language": "sv",
    "documentType": "pdf"
  }
}
```

#### POST /api/documents/analyze-structure
Analyserar dokumentstruktur med AI.

**Request:**
```json
{
  "text": "Dokumenttext...",
  "metadata": {
    "title": "BRF Solgläntan Handbok",
    "totalPages": 10,
    "language": "sv",
    "documentType": "pdf"
  },
  "templateType": "brf"
}
```

**Response:**
```json
{
  "success": true,
  "sections": [
    {
      "title": "Välkommen till din BRF",
      "content": "Sektionsinnehåll...",
      "confidence": 0.9,
      "suggestedMapping": "Välkommen till din BRF",
      "order": 1
    }
  ],
  "summary": {
    "total_sections": 5,
    "avg_confidence": 0.85,
    "template_type": "brf"
  }
}
```

### Frontend komponenter

#### DocumentImport
Huvudkomponent för dokumentimport med drag & drop interface.

**Props:**
```typescript
interface DocumentImportProps {
  onImportComplete: (sections: ImportedSection[]) => void;
  isLoading?: boolean;
}
```

#### CreateHandbookForm
Uppdaterad med tabs för att välja mellan manuell skapande och import.

## Användarflöde

1. **Filuppladdning** - Användaren drar och släpper eller väljer fil
2. **Validering** - System kontrollerar filtyp och storlek
3. **Textextraktion** - Text extraheras från dokumentet
4. **AI-analys** - Struktur analyseras och sektioner identifieras
5. **Granskning** - Användaren kan granska och justera mappningar
6. **Import** - Sektioner importeras till handboksmallen
7. **Slutförande** - Användaren kan fortsätta med normal handboksskapande

## Konfiguration

### Environment variables
```bash
# OpenAI API för dokumentanalys
OPENAI_API_KEY=your-openai-api-key-here

# Supabase för fillagring och databas
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Säkerhetsinställningar

- **Storage policies** begränsar åtkomst till autentiserade användare
- **RLS** aktiverat på alla tabeller
- **Filvalidering** för typ och storlek
- **Temporär lagring** med automatisk cleanup

## Utveckling och testning

### Lokalt test
```bash
# Installera dependencies
npm install pdf-parse mammoth uuid openai

# Starta utvecklingsservern
npm run dev

# Navigera till /create-handbook och testa import-fliken
```

### Test-filer
Rekommenderade testfiler:
- PDF med tydlig struktur och rubriker
- Word-dokument med olika sektioner
- Textfil med enkel struktur

## Begränsningar och förbättringar

### Nuvarande begränsningar
- 10MB filstorlek max
- Begränsad support för äldre .doc-filer
- AI-analys kan missa komplex struktur
- Endast svenska och engelska stöds

### Framtida förbättringar
- Support för fler filformat (PowerPoint, Google Docs)
- Förbättrad språkdetektering
- Batch-import av flera filer
- Mer avancerad strukturigenkänning
- Integration med externa dokumentsystem

## Säkerhet och integritet

- Alla uppladdade filer lagras temporärt och rensas efter analys
- Inga dokument sparas permanent utan användarens tillstånd
- AI-analys sker via OpenAI API med standard säkerhetsåtgärder
- Användardata skyddas enligt GDPR

## Support och felsökning

### Vanliga problem
1. **"Filtypen stöds inte"** - Kontrollera att filen är PDF, Word eller textfil
2. **"Filen är för stor"** - Komprimera eller dela upp dokumentet
3. **"Ingen text kunde extraheras"** - Filen kan vara skyddad eller bildbaserad
4. **"AI-analys misslyckades"** - Kontrollera OpenAI API-konfiguration

### Loggar och debugging
- Kontrollera browser console för frontend-fel
- Server-loggar innehåller detaljerad information om API-anrop
- Supabase Dashboard visar databasaktivitet och storage-användning 