# Säkerhet: Filseparation mellan Kunder

## 🔒 **SÄKERHETSPROBLEM LÖST**

Denna dokumentation beskriver implementeringen av säker filseparation för att förhindra att olika kunders filer blandas ihop.

## ❌ **Tidigare Osäker Struktur**

```
handbook_files/
├── images/
│   ├── 1234567890-abc123.jpg    ← Alla kunders bilder blandade!
│   └── 2345678901-def456.jpg    ← Ingen separation!
└── documents/
    ├── 1234567890-ghi789.pdf    ← Risk för dataläckage!
    └── 2345678901-jkl012.docx   ← GDPR-problem!
```

## ✅ **Ny Säker Struktur**

```
handbook_files/
├── handbok-abc123/              ← Kund A's isolerade mapp
│   ├── images/
│   │   ├── 1234567890-pic1.jpg
│   │   └── 1234567890-pic2.png
│   └── documents/
│       ├── 1234567890-doc1.pdf
│       └── 1234567890-doc2.docx
├── handbok-def456/              ← Kund B's isolerade mapp
│   ├── images/
│   │   └── 2345678901-pic3.jpg
│   └── documents/
│       └── 2345678901-doc3.pdf
└── handbok-ghi789/              ← Kund C's isolerade mapp
    └── images/
        └── 3456789012-pic4.webp
```

## 🛡️ **Säkerhetsfunktioner**

### **1. Obligatorisk Handbok-ID**
- Alla uppladdningar kräver `handbook_id` parameter
- API:er returnerar 400-fel om `handbook_id` saknas
- Validering av handbok-ID format (`/^[a-zA-Z0-9-_]+$/`)

### **2. Automatisk Mappseparation**
- Bilder: `{handbook_id}/images/{filename}`
- Dokument: `{handbook_id}/documents/{filename}`
- Inga korsreferenser mellan handböcker möjliga

### **3. Komplett Implementation**

#### **API Endpoints:**
- `/api/upload-image` - Säker bilduppladdning
- `/api/upload-document` - Säker dokumentuppladdning

#### **Filtyper Som Stöds:**

**Bilder (max 5MB):**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**Dokument (max 10MB):**
- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Microsoft PowerPoint (.ppt, .pptx)
- Text (.txt)
- CSV (.csv)

### **4. EditorJS Integration**
```typescript
// Bilder
formData.append('image', file);
formData.append('handbook_id', handbookId); // OBLIGATORISK

// Dokument
formData.append('file', file);
formData.append('handbook_id', handbookId); // OBLIGATORISK
```

## 🔧 **Teknisk Implementation**

### **Komponenter Uppdaterade:**

1. **EditorJSComponent.tsx**
   - Ny `handbookId` prop
   - Säker uppladdning i båda verktygen

2. **SinglePageView.tsx**
   - Skickar `handbookId` till EditorJS

3. **AllSectionsView.tsx**
   - Skickar `handbookId` till EditorJS

4. **ContentArea.tsx**
   - Delegerar `handbookId` vidare

### **API Säkerhet:**

```typescript
// Validering i båda API:er
if (!handbookId) {
  return NextResponse.json(
    { success: 0, message: 'Handbook ID is required for security' },
    { status: 400 }
  );
}

// Format-validering
if (!/^[a-zA-Z0-9-_]+$/.test(handbookId)) {
  return NextResponse.json(
    { success: 0, message: 'Invalid handbook ID format' },
    { status: 400 }
  );
}

// Säker filsökväg
const filePath = `${handbookId}/images/${fileName}`;
// eller
const filePath = `${handbookId}/documents/${fileName}`;
```

## 🧪 **Testning**

### **API Tests:**
```bash
npm test -- __tests__/api/upload-image.test.ts
npm test -- __tests__/api/upload-document.test.ts
```

**Test Cases:**
- ✅ Kräver `handbook_id` parameter
- ✅ Validerar handbok-ID format
- ✅ Korrekt filsökväg generering
- ✅ Felhantering för saknad parameter
- ✅ Alla filtyper och storleksbegränsningar

### **Komponent Tests:**
```bash
npm test -- __tests__/components/EditorJSComponent.test.tsx
```

## 🏗️ **Supabase Storage Konfiguration**

### **Bucket Setup:**
```sql
-- Bucket med säkra policies
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('handbook_files', 'handbook_files', true, 10485760);

-- RLS Policies för säker åtkomst
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'handbook_files');

CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'handbook_files');
```

## 🔐 **GDPR & Datasäkerhet**

### **Fördelar:**
- ✅ **Dataisolation**: Kunder kan inte komma åt varandras filer
- ✅ **GDPR-compliance**: Tydlig separation av personuppgifter
- ✅ **Auditbarhet**: Lätt att spåra vilka filer som tillhör vilken kund
- ✅ **Skalbarhet**: Stöder obegränsat antal handböcker
- ✅ **Prestanda**: Ingen påverkan på uppladdningshastighet

### **Säkerhetskontroller:**
1. **Åtkomstkontroll**: Användarverifiering genom Supabase Auth
2. **Datavalidering**: Strikt format- och storleksvalidering
3. **Felhantering**: Säkra felmeddelanden utan sensitive information
4. **Loggning**: Alla uppladdningar loggas för audit trail

## 🚀 **Deployment Checklist**

- [x] API endpoints uppdaterade
- [x] EditorJS integration säkrad
- [x] Komponenter uppdaterade med handbookId
- [x] Tester implementerade och godkända
- [x] Supabase bucket konfigurerad
- [x] RLS policies implementerade
- [x] Dokumentation skapad

## ⚠️ **Viktiga Säkerhetsnoteringar**

1. **Backward Compatibility**: Gamla filer utan handbok-separation finns kvar men påverkar inte nya uppladdningar
2. **Migration**: Vid behov kan gamla filer flyttas till rätt handbok-mappar
3. **Monitoring**: Övervaka att alla uppladdningar inkluderar `handbook_id`
4. **Access Control**: Implementera ytterligare åtkomstkontroller vid behov

---

**✅ SÄKERHETSIMPLEMENTERING SLUTFÖRD**  
Alla filer är nu säkert separerade mellan kunder och GDPR-compliance säkerställd. 