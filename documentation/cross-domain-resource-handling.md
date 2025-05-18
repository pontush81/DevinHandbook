# Cross-Domain Resource Handling i Handbok.org

Detta dokument beskriver hur vi löser problem med resursinladdning och autentisering över subdomäner i Handbok.org.

## Problemöversikt

Handbok.org använder subdomäner (t.ex. `example.handbok.org`) för vissa funktioner. Detta orsakar flera tekniska utmaningar:

1. **CORS-begränsningar**: Webbläsare begränsar åtkomst till resurser mellan olika domäner
2. **Lagringsbegränsningar**: LocalStorage och cookies är inte delade mellan domäner
3. **Font-laddningsproblem**: Typsnitt laddas inte korrekt på subdomäner
4. **Redirect-loopar**: Uppstår när resurser omdirigeras mellan domäner

## Lösningsöversikt

Vi har implementerat flera mekanismer för att hantera dessa problem:

### 1. Resurs-proxy och omskrivning

Filer involverade:
- `public/static-resource-fix.js` - Klientskript för att omskriva resurslänkar
- `src/app/api/resources/route.ts` - API-proxy för att hämta resurser från huvuddomänen
- `next.config.js` - Konfiguration för rewrites och headers

Funktioner:
- Detekterar om sidan körs på en subdomän
- Omskriver `/_next/static/*` länkar till att peka på huvuddomänen
- Erbjuder en proxy-fallback via API om direktlänkar misslyckas
- Tillhandahåller nöd-CSS och JS som fallback

### 2. Cross-Domain Storage

Filer involverade:
- `public/cross-domain-storage.js` - Klientskript för säker storageanvändning
- `public/storage-bridge.html` - Iframe-sida för att dela localStorage
- `public/auth-bridge.html` - Iframe-sida för att dela autentisering

Funktioner:
- Säkra wrappers för localStorage/sessionStorage
- Iframe-baserad cross-domain kommunikation
- Fallback när storage inte är tillgängligt

### 3. Fallback & Nödåtgärder

Filer involverade:
- `src/app/layout.tsx` - Inlinear kritisk CSS och nödlägesskript
- `public/static-fallback.html` - Statisk nödsida
- `src/app/api/health-check/route.ts` - API för hälsokontroll

Funktioner:
- Detekterar och avbryter redirect-loopar
- Tillhandahåller inline CSS som fungerar utan externa resurser
- Visar nödmeddelanden för användaren vid problem

## Detaljerad Funktionsbeskrivning

### Static Resource Fix

Denna lösning har flera fallback-nivåer:

1. **Direktlänkar**: Resurser laddas direkt från `handbok.org`
2. **Proxy-API**: Om direktlänkar misslyckas, laddas resurser via vår proxy-API
3. **Inline Fallback**: Om proxy också misslyckas, används inlineat innehåll

Skriptet övervakar dynamiskt resursladdning och byter strategi vid fel.

### Cross-Domain Storage

Vår lösning använder iframe-baserad kommunikation:

1. En dold iframe laddas från huvuddomänen
2. Window.postMessage används för att kommunicera med huvuddomänen
3. Båda domäner kan nu dela localStorage-data säkert

### Säkerhetsaspekter

- Alla cross-domain resurser har nödvändiga CORS-headers
- Endast trafik från godkända domäner tillåts
- Vi validerar och saniterar alla meddelandedata

## Felsökning

Vanliga problem och lösningar:

### 1. Font-laddningsfel

Symtom: 404-fel för `.woff2`-filer eller text visas med systemtypsnitt.

Lösning:
- Verifiera att `static-resource-fix.js` laddas före andra resurser
- Kontrollera nätverkstrafik för omskrivna font-URLs
- Använd fontfallbacks definierade i CSS

### 2. Redirect-loopar

Symtom: ERR_TOO_MANY_REDIRECTS eller ingen laddning av CSS/JS.

Lösning:
- Rensa sessionslagring och cookies
- Kontrollera redirect-räknaren i konsolen
- Verifiera att `next.config.js` rewrites är korrekt konfigurerade

### 3. Lagringsåtkomstfel

Symtom: "Access to storage is not allowed from this context"

Lösning:
- Kontrollera att auth-bridge iframe är korrekt laddad
- Använd `window.safeStorage` för all localStorage-åtkomst
- Verifiera att cross-domain-storage.js laddas före kod som behöver storage

## Framtida Förbättringar

- Implementera Service Worker för offlinestöd och bättre resurscachning
- Förbättra feldetektering och automatisk åtgärd
- Centralisera domänkonfiguration till en enda plats 