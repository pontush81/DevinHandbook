# Cookiepolicy för Handbok.org

**Senast uppdaterad: [DATUM]**

## 1. Inledning

Denna cookiepolicy förklarar hur Handbok.org använder cookies och liknande tekniker när du besöker vår webbplats. Vi värnar om din integritet och ger dig full kontroll över vilka cookies du accepterar.

**Tjänsteleverantör:**
- Företag: [FÖRETAGSNAMN]
- Organisationsnummer: [ORGANISATIONSNUMMER]
- Adress: [FÖRETAGSADRESS]
- E-post: info@handbok.org

## 2. Vad är cookies?

Cookies är små textfiler som lagras på din enhet (dator, mobil, surfplatta) när du besöker en webbplats. De hjälper webbplatsen att:
- Komma ihåg dina inställningar
- Förbättra din användarupplevelse
- Säkerställa säkerhet
- Hantera inloggningar

## 3. Hur vi använder cookies

### 3.1 Integritetsvänlig approach
Vi har medvetet valt att **INTE** använda:
- Google Analytics eller andra tracking-tjänster
- Marknadsföringscookies
- Cookies för annonsering
- Cookies för beteendeanalys från tredje part

### 3.2 Våra cookiekategorier

## 4. Detaljerad cookie-information

### 4.1 Nödvändiga cookies (kan inte avaktiveras)

**Supabase autentisering:**
- **Namn**: `sb-[project-id]-auth-token`
- **Ändamål**: Hanterar din inloggningssession
- **Lagringstid**: 7 dagar
- **Typ**: HTTP-cookie, säker, SameSite
- **Säkerhet**: Secure: true, HttpOnly: true, SameSite: Lax
- **Leverantör**: Supabase

- **Namn**: `sb-[project-id]-auth-token-code-verifier`
- **Ändamål**: Säkerhet för inloggningsprocessen
- **Lagringstid**: 5 minuter
- **Typ**: HTTP-cookie, säker
- **Säkerhet**: Secure: true, HttpOnly: true, SameSite: Lax
- **Leverantör**: Supabase

**Sessionshantering:**
- **Namn**: `sb-[project-id]-auth-refresh-token`
- **Ändamål**: Automatisk förnyelse av sessioner
- **Lagringstid**: 30 dagar
- **Typ**: HTTP-cookie, säker, HttpOnly
- **Säkerhet**: Secure: true, HttpOnly: true, SameSite: Lax
- **Leverantör**: Supabase

### 4.2 Funktionella cookies (kräver samtycke)

**Användarpreferenser:**
- **Namn**: `handbook-preferences`
- **Ändamål**: Sparar inställningar som sidebar-läge, tema
- **Lagringstid**: 30 dagar
- **Typ**: localStorage
- **Leverantör**: Handbok.org

**Cookie-samtycke:**
- **Namn**: `cookie_consent`
- **Ändamål**: Minns ditt cookie-samtycke
- **Lagringstid**: 1 år
- **Typ**: localStorage
- **Leverantör**: Handbok.org

- **Namn**: `cookie_consent_date`
- **Ändamål**: Datum för cookie-samtycke
- **Lagringstid**: 1 år
- **Typ**: localStorage
- **Leverantör**: Handbok.org

### 4.3 Cookies vi INTE använder ✅

**Inga tracking-cookies:**
- Inga Google Analytics cookies
- Inga Facebook Pixel cookies
- Inga marknadsföringscookies
- Inga cookies för annonsering

**Inga tredjepartscookies för spårning:**
- Vi delar inte data med marknadsföringsbolag
- Vi spårar inte din aktivitet på andra webbplatser
- Vi bygger inte profiler för reklam
- Inga cookies delas med reklamnätverk eller tredje part för analysändamål

## 5. Samtycke och val

### 5.1 Cookie-banner
När du besöker vår webbplats första gången visas en cookie-banner där du kan välja:
- **"Acceptera alla"**: Tillåter både nödvändiga och funktionella cookies
- **"Endast nödvändiga"**: Tillåter bara cookies som krävs för grundläggande funktionalitet
- **"Visa detaljer"**: Mer information om våra cookies

### 5.2 Dina val
Du kan när som helst:
- Ändra dina cookie-inställningar på `/cookie-settings`
- Återkalla ditt samtycke
- Rensa alla cookies via din webbläsare

### 5.3 Vad händer när du avvisar cookies?
Om du väljer "Endast nödvändiga":
- Inloggning fungerar normalt (nödvändiga cookies)
- Dina preferenser sparas inte mellan sessioner
- Vissa funktioner kan bli begränsade
- Ingen funktionalitet förloras helt

## 6. Hantera cookies

### 6.1 Via vår webbplats
- **Cookie-inställningar**: handbok.org/cookie-settings
- **Återställ samtycke**: Rensa cookies och besök webbplatsen igen
- **Hjälp**: Kontakta oss på info@handbok.org

### 6.2 Via din webbläsare

**Chrome:**
1. Klicka på menyikonen (tre prickar) → Inställningar
2. Avancerat → Sekretess och säkerhet → Cookies
3. Hantera cookies för handbok.org

**Firefox:**
1. Klicka på menyikonen → Inställningar
2. Sekretess och säkerhet → Cookies och webbplatsdata
3. Hantera data för handbok.org

**Safari:**
1. Safari → Inställningar → Sekretess
2. Hantera webbplatsdata
3. Sök efter handbok.org

**Edge:**
1. Klicka på menyikonen → Inställningar
2. Cookies och webbplatsbehörigheter
3. Hantera cookies för handbok.org

### 6.3 Mobilenheter

**iOS Safari:**
1. Inställningar → Safari → Avancerat
2. Rensa cookies och data

**Android Chrome:**
1. Chrome → Inställningar → Sekretess
2. Rensa webbdata

## 7. Teknisk information

### 7.1 Säkerhet
Alla våra cookies använder:
- **Secure-flaggan**: Skickas endast över HTTPS
- **SameSite-attribut**: Skydd mot CSRF-attacker
- **HttpOnly**: Skydd mot XSS-attacker (för känsliga cookies)

### 7.2 Kryptering
- Lösenord lagras krypterat (aldrig i cookies)
- Sessionstoken är säkert genererade
- Känslig data krypteras både i vila och transit

### 7.3 Datalagring
- **Cookies**: Lagras lokalt på din enhet
- **localStorage**: Lagras lokalt på din enhet
- **Ingen molnlagring**: Cookies skickas inte till externa servrar

## 8. Tredjepartstjänster

### 8.1 Supabase (Autentisering)
- **Cookies**: Autentisering och sessionshantering
- **Dataskydd**: GDPR-kompatibel, data inom EU
- **Webbplats**: supabase.com/privacy

### 8.2 Stripe (Betalningar)
- **Cookies**: Endast under betalningsprocessen
- **Ändamål**: Säkerhet och bedrägeriskydd
- **Dataskydd**: PCI DSS-certifierad, GDPR-kompatibel
- **Webbplats**: stripe.com/privacy

### 8.3 Vercel (Hosting)
- **Cookies**: Eventuella tekniska cookies för CDN
- **Ändamål**: Optimering av webbplatsens prestanda
- **Dataskydd**: GDPR-kompatibel
- **Webbplats**: vercel.com/legal/privacy-policy

## 9. Uppdateringar av cookiepolicy

### 9.1 Ändringar
Vi kan uppdatera denna cookiepolicy för att:
- Återspegla ändringar i vår tjänst
- Följa nya lagar och regler
- Förbättra tydligheten

### 9.2 Meddelanden
Vid väsentliga ändringar meddelar vi dig via:
- E-post (om du har ett konto)
- Notifikation på webbplatsen
- Uppdaterat datum överst i policyn

## 10. Dina rättigheter

### 10.1 Enligt GDPR har du rätt att:
- **Information**: Få veta vilka cookies vi använder
- **Samtycke**: Ge eller återkalla samtycke för icke-nödvändiga cookies
- **Tillgång**: Få information om cookies som lagras på din enhet
- **Radering**: Begära radering av dina cookiedata

### 10.2 Kontakt
För frågor om cookies eller för att utöva dina rättigheter:
- **E-post**: info@handbok.org
- **Adress**: [FÖRETAGSADRESS]

## 11. Klagomål

Om du har klagomål om vår cookieanvändning kan du kontakta:
- **Integritetsskyddsmyndigheten (IMY)**
- **Webbplats**: imy.se
- **Telefon**: 08-657 61 00
- **E-post**: imy@imy.se

## 12. Internationella användare

### 12.1 EU/EES-användare
- Denna policy följer GDPR-krav
- Du har alla rättigheter enligt GDPR
- Data behandlas inom EU när möjligt

### 12.2 Användare utanför EU
- Vi behandlar data enligt svenska lagar
- Samma integritetsstandarder gäller
- Kontakta oss för specifika frågor

## 13. Teknisk support

### 13.1 Problem med cookies?
Om du har tekniska problem relaterade till cookies:
1. Kontrollera din webbläsares inställningar
2. Rensa cookies och försök igen
3. Kontakta oss om problemet kvarstår

### 13.2 Vanliga frågor

**F: Fungerar webbplatsen utan cookies?**
S: Ja, grundläggande funktionalitet fungerar med endast nödvändiga cookies.

**F: Spårar ni min aktivitet på andra webbplatser?**
S: Nej, vi använder inga tracking-cookies eller tredjepartstjänster för spårning.

**F: Kan jag använda tjänsten helt utan cookies?**
S: Nej, nödvändiga cookies krävs för inloggning och säkerhet.

**F: Vad händer om jag rengör cookies?**
S: Du blir utloggad och måste logga in igen. Dina preferenser nollställs.

---

## Sammanfattning

Vi på Handbok.org använder cookies på ett integritetsvänligt sätt:
- ✅ Endast nödvändiga cookies för grundläggande funktionalitet
- ✅ Funktionella cookies för bättre användarupplevelse (med samtycke)
- ❌ Inga tracking-cookies eller marknadsföringscookies
- ❌ Inga tredjepartstjänster för spårning

**Du har full kontroll över dina cookies via våra cookie-inställningar.**

*Har du frågor? Kontakta oss på info@handbok.org* 