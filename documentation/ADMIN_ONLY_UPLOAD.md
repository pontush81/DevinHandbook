# 🔐 Admin-endast Filuppladdning

**Datum:** 2025-01-04  
**Status:** ✅ **IMPLEMENTERAT OCH TESTAT**

## 🎯 Översikt

Vi har implementerat säker admin-endast filuppladdning för att skydda handboksystemet och säkerställa att endast auktoriserade användare kan ladda upp filer. Detta är en viktig säkerhetsåtgärd som förhindrar att obehöriga användare laddar upp potentiellt skadligt innehåll.

## 🛡️ Säkerhetsfunktioner

### 1. **Autentiseringskontroll**
- ✅ Kräver giltig användarsession
- ✅ Kontrollerar att användaren är inloggad
- ✅ Returnerar 401 Unauthorized för icke-autentiserade förfrågningar

### 2. **Admin-behörighetskontroll**  
- ✅ Verifierar att användaren är admin för den specifika handboken
- ✅ Använder `isHandbookAdmin()` funktionen för kontroll
- ✅ Returnerar 403 Forbidden för icke-admin användare

### 3. **Säker Filuppladdning**
- ✅ Använder service role client för att kringgå RLS-policies
- ✅ Filseparation per handbok (`handbook_id/images/` och `handbook_id/documents/`)
- ✅ Filvalidering (typ, storlek)
- ✅ Unikt filnamn för att förhindra konflikter

## 📋 Implementation Detaljer

### API Endpoints

Båda upload-endpoints har uppdaterats med admin-kontroll:

#### `/api/upload-image`
```typescript
export async function POST(request: NextRequest) {
  // 1. Check authentication
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: 0, message: 'Authentication required' },
      { status: 401 }
    );
  }

  // 2. Check if user is admin for this handbook
  const isAdmin = await isHandbookAdmin(session.user.id, handbookId);
  if (!isAdmin) {
    return NextResponse.json(
      { success: 0, message: 'Admin permissions required for file upload' },
      { status: 403 }
    );
  }
  
  // 3. Use service role client to bypass RLS policies
  const supabase = getServiceSupabase();
  
  // 4. Continue with file upload...
}
```

#### `/api/upload-document`
Samma säkerhetsstruktur som bilduppladdning.

### Frontend Integration

EditorJS-komponenten har uppdaterats med förbättrad felhantering:

```typescript
// EditorJSComponent.tsx
uploader: {
  uploadByFile: async (file: File) => {
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include cookies for auth
      });
      
      if (result.success === 1) {
        return result;
      } else {
        // Handle specific error types
        if (response.status === 401) {
          throw new Error('Du måste vara inloggad för att ladda upp bilder');
        } else if (response.status === 403) {
          throw new Error('Du måste vara admin för denna handbok för att ladda upp bilder');
        }
      }
    } catch (error) {
      // Show user-friendly error message
      alert(`Bilduppladdning misslyckades: ${error.message}`);
      throw error;
    }
  }
}
```

## 👤 Användarupplevelse

### För Admin-användare
1. **Fungerar som vanligt** - kan ladda upp bilder och dokument
2. **Säker filhantering** - filer lagras isolerat per handbok
3. **Tydliga felmeddelanden** om något går fel

### För Icke-admin användare
1. **Tydligt meddelande** om att admin-behörighet krävs
2. **Hjälptext uppdaterad** för att visa "endast admin" för fil-funktioner
3. **Graceful degradering** - kan fortfarande använda alla andra redigeringsfunktioner

### Felmeddelanden
- **Ej inloggad:** "Du måste vara inloggad för att ladda upp bilder/dokument"
- **Ej admin:** "Du måste vara admin för denna handbok för att ladda upp bilder/dokument"
- **Allmänt fel:** Visar specifikt felmeddelande från servern

## 🔧 Tekniska Detaljer

### Autentiseringseflöde
```
1. Användare försöker ladda upp fil
2. Frontend skickar request med cookies (credentials: 'include')
3. API kontrollerar getServerSession()
4. API kontrollerar isHandbookAdmin(userId, handbookId)
5. Om godkänd: Använd getServiceSupabase() för upload
6. Om inte: Returnera lämpligt felmeddelande
```

### Dependencies
- `@/lib/auth-utils` - för `getServerSession()` och `isHandbookAdmin()`
- `@/lib/supabase` - för `getServiceSupabase()`
- Supabase Service Role Key för att kringgå RLS

### RLS Policy Bypass
Vi använder service role client istället för vanlig client för att:
- Kringgå Row Level Security policies
- Säkerställa att filer kan laddas upp till storage
- Behålla kontroll på applikationsnivå (admin-check)

## 🧪 Testning

### Nya Test Cases

#### Upload Image Tests
```typescript
it('should return error for unauthenticated user', async () => {
  (getServerSession as jest.Mock).mockResolvedValue(null);
  // ... test implementation
  expect(response.status).toBe(401);
  expect(data.message).toBe('Authentication required');
});

it('should return error for non-admin user', async () => {
  (isHandbookAdmin as jest.Mock).mockResolvedValue(false);
  // ... test implementation  
  expect(response.status).toBe(403);
  expect(data.message).toBe('Admin permissions required for file upload');
});
```

#### Upload Document Tests
Samma struktur som bilduppladdningstester.

### Kör Tester
```bash
# Test både image och document upload
npm test -- --testPathPattern="upload-"

# Test specifikt
npm test -- --testPathPattern="upload-image"
npm test -- --testPathPattern="upload-document"
```

## 📚 Dokumentation Updates

### EditorJS Hjälptext
```typescript
<p className="text-xs text-blue-600 mt-1">
  💡 Bilder: Stöder JPEG, PNG, GIF, WebP (max 5MB) - 
  <span className="font-semibold text-orange-600">endast admin</span>
</p>
<p className="text-xs text-green-600">
  📎 Dokument: Stöder PDF, Word, Excel, PowerPoint, text, CSV (max 10MB) - 
  <span className="font-semibold text-orange-600">endast admin</span>
</p>
```

## 🔒 Säkerhetsfördelar

1. **Förhindrar obehörig filuppladdning**
2. **Skyddar mot skadligt innehåll** 
3. **Minskar risk för missbruk av lagringsutrymme**
4. **Säkerställer dataisolation** mellan handböcker
5. **Följer principle of least privilege**
6. **GDPR-kompatibel** fil separation

## 🚀 Deployment Checklist

- [x] API endpoints uppdaterade med auth-kontroller
- [x] Frontend felhantering implementerad  
- [x] Hjälptext uppdaterad
- [x] Tester implementerade och godkända
- [x] Service role client används för uploads
- [x] Dokumentation skapad
- [x] Build test genomfört

## 📝 Framtida Förbättringar

1. **Roll-baserad filuppladdning** - tillåt editor-roll att ladda upp vissa filtyper
2. **Filkvot per handbok** - begränsa lagringsanvändning  
3. **Virus-scanning** av uppladdade filer
4. **Audit log** för filuppladdningar
5. **Bulk upload** för admin-användare

---

**Status:** ✅ Färdig och redo för produktion
**Testning:** ✅ Alla tester godkända  
**Säkerhet:** ✅ Admin-endast kontroll implementerad 