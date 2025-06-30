# Dynamiska PWA Manifest - Handbok App

## Översikt

Vi har implementerat dynamiska PWA-manifest för att lösa problemet där "Lägg till på hemskärmen" på iPhone ledde till fel URL. Nu får varje handbok sitt eget anpassade manifest med rätt start-URL.

## Problem som löstes

### Före (Problem)
- **iPhone "Lägg till på hemskärmen"** ledde alltid till `www.handbok.org` istället för den specifika handboken
- **Ful ikon** - bara ett enkelt "H" på blå bakgrund
- **Statisk manifest** - samma för alla handböcker

### Efter (Lösning) 
- **Korrekt URL** - appen startar direkt på den handbok användaren var på
- **Vacker ikon** - modern bokdesign med gradient och textlinjer
- **Dynamisk manifest** - anpassat för varje handbok med rätt namn och genvägar

## Implementation

### 1. Dynamisk Manifest API (`/api/manifest`)

```typescript
// GET /api/manifest - Bas manifest för huvudsidan
// GET /api/manifest?slug=exempel - Handboksspecifikt manifest
```

**Funktioner:**
- **Bas manifest** för huvudsidan
- **Anpassat manifest** för varje handbok med:
  - Rätt `start_url` (t.ex. `/example-handbook`)
  - Handbokens titel som app-namn
  - Anpassade genvägar (handbok, meddelanden, medlemmar)
  - Korrekt scope för appen

### 2. Dynamic Manifest Component

```tsx
<DynamicManifest handbookSlug="example-handbook" />
```

Automatiskt:
- Tar bort befintlig manifest-länk
- Skapar ny manifest-länk med rätt slug
- Uppdateras när användaren navigerar mellan handböcker

### 3. Förbättrade Ikoner

**Ny design:**
- **Gradient bakgrund** (blå till mörkblå)
- **Bokdesign** med ryggrad och textlinjer
- **Modern utseende** med skuggor och avrundade hörn
- **Responsiv** - ser bra ut i alla storlekar (16px till 512px)

**Genererade storlekar:**
- 16x16px (favicon)
- 32x32px (små ikoner)
- 192x192px (PWA standard)
- 512x512px (stora skärmar)
- 180x180px (Apple Touch Icon)

### 4. Smart Caching

**Service Worker** hanterar manifest-caching:
- **1 timme cache** för manifest-API
- **Automatisk uppdatering** när cache blir gammal
- **Offline fallback** till senast kända manifest
- **Emergency fallback** till bas-manifest

## Så fungerar det

### För användare

1. **På en handbok:** Användaren besöker `/exempel-handbok`
2. **Lägg till på hemskärmen:** Klickar på "Lägg till på hemskärmen" (iPhone) eller installationsknappen (Android/Desktop)
3. **Rätt namn:** Appen heter "Exempel Handbok - Handbok"
4. **Rätt start:** När appen öppnas från hemskärmen startar den på `/exempel-handbok`
5. **Genvägar:** Longpress på app-ikonen visar genvägar till meddelanden, medlemmar etc.

### För utvecklare

```typescript
// Manifest genereras automatiskt baserat på slug
const manifestUrl = `/api/manifest?slug=${handbookSlug}`;

// Komponenten hanterar uppdatering av manifest-länk
<DynamicManifest handbookSlug={handbookSlug} />
```

## Testning

### iPhone (Safari)
1. Besök en handbok (t.ex. `/tdgdf5`)
2. Tryck på delningsknappen (⎦)
3. Välj "Lägg till på hemskärmen"
4. **Verifiera:** App-namnet är handbokens titel
5. **Verifiera:** När appen öppnas hamnar du på rätt handbok

### Android (Chrome)
1. Besök en handbok
2. Chrome visar automatiskt "Lägg till på hemskärmen"
3. **Verifiera:** Rätt namn och ikon
4. **Verifiera:** Rätt start-URL

### Desktop (Chrome/Edge)
1. Besök en handbok
2. Klicka på installations-ikonen i adressfältet
3. **Verifiera:** Installeras som separat app med rätt namn

## Tekniska detaljer

### API Response Exempel

```json
{
  "name": "Min BRF - Handbok",
  "short_name": "Min BRF",
  "description": "Min BRF - Din digitala handbok, alltid tillgänglig offline",
  "start_url": "/min-brf",
  "scope": "/min-brf/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "shortcuts": [
    {
      "name": "Visa handbok",
      "url": "/min-brf"
    },
    {
      "name": "Meddelanden", 
      "url": "/min-brf/meddelanden"
    },
    {
      "name": "Medlemmar",
      "url": "/min-brf/members"
    }
  ]
}
```

### Service Worker Caching

```javascript
// Manifest cachas i 1 timme
if (url.pathname.includes('/api/manifest')) {
  return await manifestCacheStrategy(request);
}
```

### Använd på följande sidor

- `/[slug]/page.tsx` - Huvudhandbokssida
- `/[slug]/meddelanden/page.tsx` - Meddelandesida  
- `/[slug]/members/page.tsx` - Medlemssida

## Fördelar

### Användarupplevelse
- ✅ **Rätt URL** när man lägger till på hemskärmen
- ✅ **Professionell ikon** istället för enkel text
- ✅ **Anpassat namn** för varje handbok
- ✅ **Snabba genvägar** till viktiga funktioner

### Tekniska fördelar
- ✅ **Automatisk caching** för bättre prestanda
- ✅ **Offline-stöd** med fallbacks
- ✅ **SEO-vänligt** med rätt manifest per sida
- ✅ **Skalbart** - fungerar för alla nya handböcker

## Underhåll

### Nya ikoner
```bash
cd scripts
python3 generate-improved-pwa-icons.py
```

### Cache-rensning
```javascript
// I browser console
clearPWACache();
```

### Debugging
```javascript
// Kontrollera manifest-URL
console.log(document.querySelector('link[rel="manifest"]').href);

// Se cache-status
navigator.serviceWorker.ready.then(reg => console.log(reg));
```

---

**Implementerat:** December 2024  
**Status:** ✅ Aktivt  
**Kompatibilitet:** iPhone Safari, Android Chrome, Desktop Chrome/Edge/Firefox 