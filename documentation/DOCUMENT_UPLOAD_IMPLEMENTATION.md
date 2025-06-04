# Dokumentuppladdning Implementation

## Översikt

Denna dokumentation beskriver implementeringen av dokumentuppladdningsfunktionen i handboken. Funktionen låter användare ladda upp och inkludera olika typer av dokument direkt i EditorJS-innehållet.

## Funktioner

### Stödda Filformat
- **PDF**: `application/pdf`
- **Microsoft Word**: 
  - `.doc`: `application/msword`
  - `.docx`: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Microsoft Excel**:
  - `.xls`: `application/vnd.ms-excel`
  - `.xlsx`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Microsoft PowerPoint**:
  - `.ppt`: `application/vnd.ms-powerpoint`
  - `.pptx`: `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **Textfiler**: `text/plain`
- **CSV**: `text/csv`, `application/csv`

### Begränsningar
- **Maximal filstorlek**: 10MB
- **Säkerhet**: Strikt validering av filtyper
- **Lagring**: Supabase Storage med offentliga URL:er

## Teknisk Implementation

### 1. API Endpoint (`/api/upload-document`)

```typescript
// src/app/api/upload-document/route.ts
export async function POST(request: NextRequest) {
  // Validering av filtyp och storlek
  // Upload till Supabase Storage
  // Returnerar EditorJS-kompatibelt svar
}
```

**Funktioner:**
- Validerar filtyp mot tillåtna MIME-typer
- Kontrollerar filstorlek (max 10MB)
- Genererar unika filnamn för att undvika konflikter
- Laddar upp till Supabase Storage under `documents/` prefix
- Returnerar offentlig URL för direkt åtkomst

### 2. EditorJS Integration

**AttachesTool Konfiguration:**
```typescript
attaches: {
  class: AttachesTool,
  config: {
    endpoint: '/api/upload-document',
    field: 'file',
    types: 'application/pdf,application/msword,...',
    buttonText: 'Välj dokument...',
    errorMessage: 'Kunde inte ladda upp dokumentet...',
    uploader: {
      uploadByFile: async (file: File) => {
        // Custom upload logik
      }
    }
  }
}
```

**Funktioner:**
- Svenska lokalisering av UI-text
- Custom error handling
- Direkt integration med vår upload API
- Drag & drop stöd via EditorJS

### 3. UI/UX Förbättringar

**Hjälptext:**
- Uppdaterad hjälpsektion med dokumentinfo
- Visuella ikoner (📎) för enkel identifiering
- Tydlig information om filstorlek och format

**Felhantering:**
- Användarvänliga felmeddelanden på svenska
- Detaljerad loggning för utvecklare
- Graceful fallbacks vid upload-fel

## Säkerhet

### Filvalidering
```typescript
const validTypes = [
  'application/pdf',
  'application/msword',
  // ... andra tillåtna typer
];

if (!validTypes.includes(file.type)) {
  return NextResponse.json({
    success: 0, 
    message: 'Invalid file type...'
  });
}
```

### Storlek Begränsning
```typescript
const maxSize = 10 * 1024 * 1024; // 10MB
if (file.size > maxSize) {
  return error('File too large');
}
```

### Säker Filnamn
```typescript
const fileName = `${Date.now()}-${Math.random().toString(36)}.${fileExt}`;
```

## Testning

### API Tester
- ✅ PDF upload
- ✅ Word dokument upload
- ✅ Excel fil upload
- ✅ PowerPoint presentation upload
- ✅ Text och CSV filer
- ✅ Filtyp validering
- ✅ Storlek validering
- ✅ Felhantering

### Komponent Tester
- ✅ AttachesTool integration
- ✅ Hjälptext uppdateringar
- ✅ UI rendering

## Användning

### För Användare
1. Öppna EditorJS editorn
2. Tryck `/` för att öppna block-menyn
3. Välj "Attaches" eller "Bifoga"
4. Klicka "Välj dokument..." eller dra och släpp fil
5. Dokumentet laddas upp och visas som nedladdningsbar länk

### För Utvecklare
```typescript
// Exempel på hur man renderar ett document block
const documentBlock = {
  type: 'attaches',
  data: {
    file: {
      url: 'https://example.com/document.pdf',
      name: 'important-document.pdf',
      size: 1234567,
      extension: 'pdf'
    }
  }
};
```

## Framtida Förbättringar

### Potentiella Tillägg
- **Förhandsvisning**: PDF och bild förhandsvisning
- **Dokumenthantering**: Lista och hantera uppladdade dokument
- **Versionshantering**: Håll flera versioner av samma dokument
- **Metadata**: Lägg till beskrivningar och taggar
- **Komprimering**: Automatisk komprimering av stora filer

### Optimeringar
- **CDN Integration**: Snabbare leverans via CDN
- **Lazy Loading**: Ladda dokument först när de behövs
- **Batch Upload**: Upload flera dokument samtidigt
- **Progress Indicators**: Visa upload-progress för stora filer

## Felsökning

### Vanliga Problem

**"Invalid file type" Fel:**
- Kontrollera att filen har rätt MIME-typ
- Vissa äldre filer kan ha felaktiga MIME-typer
- Använd moderna versioner av Office-dokument (.docx, .xlsx, .pptx)

**"File too large" Fel:**
- Maxstorlek är 10MB
- Komprimera dokumentet eller dela upp det
- För PDF: använd PDF-komprimering

**Upload Misslyckas:**
- Kontrollera internetanslutning
- Verifiera att Supabase Storage är konfigurerat
- Kolla logs för detaljerade felmeddelanden

### Debug Information
```typescript
// Aktivera debug logs
console.log('Document upload attempt:', {
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type
});
```

## Konfiguration

### Miljövariabler
Använder samma Supabase-konfiguration som bilduppladdning:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase Storage
Dokumenten lagras i bucket `handbook_files` under prefix `documents/`:
```
handbook_files/
├── images/          (bilder)
└── documents/       (dokument)
    ├── 1234567890-abc123.pdf
    ├── 1234567891-def456.docx
    └── ...
```

## Performance

### Optimeringar
- **Unique Filnamn**: Förhindrar caching-konflikter
- **Compression Headers**: Aktiverat för bättre prestanda
- **Error Boundaries**: Förhindrar krascher vid upload-fel
- **Debounced Auto-save**: Minskar API-anrop

### Monitoring
- Upload success rate
- Genomsnittlig upload-tid
- Felfrekvens per filtyp
- Storage användning 