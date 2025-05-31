# UX Guidelines - Handbok.org

## Onboarding-flöde

### Huvudprinciper
1. **Tydlighet före enkelhet** - Bättre att vara tydlig än att bara vara snabb
2. **Förväntningar** - Användaren ska alltid veta vad som händer härnäst
3. **Kontext** - Förklara varför varje steg behövs
4. **Framsteg** - Visa var användaren befinner sig i processen

### Onboarding-steg

#### 1. Landingssida
**Mål:** Separera nya användare från befintliga användare

**CTA-knappar:**
- **Primär:** "Skapa konto & handbok" → `/signup`
- **Sekundär:** "Logga in" → `/login`

**Messaging:**
- Tydlig förklaring av vad som händer när man klickar
- Hjälptext som förklarar att nya användare behöver skapa konto först

#### 2. Registreringssida (`/signup`)
**Mål:** Skapa konto med förståelse för nästa steg

**Designprinciper:**
- Visa progress-indikator (steg 1 av 3: Skapa konto → Verifiera e-post → Skapa handbok)
- Prioritera e-postverifiering som första uppgift
- Tydlig ordning med numrerade steg

**Meddelanden:**
- Informationsruta: "Nästa steg" med numrerade instruktioner
- Success-meddelande: Visuellt strukturerat med STEG 1 och STEG 2

#### 3. E-postverifiering
**Mål:** Tydlig prioritet på verifiering innan handboksskapande

**Designprinciper:**
- Förklara att detta MÅSTE ske först
- Använd visuella signaler (röd text för "STEG 1")
- Sätt tydliga förväntningar på timing
- Strukturerat success-meddelande med ikoner och steg

#### 4. Första inloggning
**Mål:** Smidigt flöde från inloggning till handboksskapande

**Dashboard för nya användare:**
- Celebrerande ton (🎉)
- Tydlig nästa-steg-guide  
- Förklara värdet av att skapa handbok
- Stor, tydlig CTA-knapp

### Call-to-Action best practices

#### Knapptexter
- **Tydliga:** "Skapa konto & handbok" istället för "Kom igång nu"
- **Handlingsfokuserade:** "🚀 Skapa din första handbok"
- **Kontextuella:** Anpassa text baserat på var användaren befinner sig

#### Knappplacering
- Primär åtgärd alltid mest synlig
- Sekundära åtgärder tydligt separerade
- Använd färg och storlek för att guida uppmärksamhet

### Meddelanden och mikrokopior

#### Informativa meddelanden
```tsx
// Bra: Förklarar värdet
"Efter att du skapat ditt konto kan du direkt börja skapa din första digitala handbok"

// Undvik: Bara teknisk information  
"Du måste bekräfta din e-post"
```

#### Success-meddelanden
```tsx
// Strukturerat med visuell hierarki
<div className="space-y-2">
  <div className="flex items-start gap-2">
    <MailIcon />
    <span className="font-bold text-red-600">STEG 1:</span> Kolla din e-post och klicka på bekräftelselänken
  </div>
  <div className="flex items-start gap-2">
    <span>📚</span>
    <span className="font-bold text-blue-600">STEG 2:</span> Logga in och skapa din första handbok
  </div>
</div>
```

#### Progress-indikatorer
```tsx
// Tydlig 3-stegs process
<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">1. Skapa konto</span>
<span>→</span>
<span className="text-gray-400">2. Verifiera e-post</span>
<span>→</span>
<span className="text-gray-400">3. Skapa handbok</span>
```

### Fel-hantering

#### Registreringsfel
- Tydliga felmeddelanden
- Förslag på lösningar
- Behåll användarens input
- Erbjud alternativ (t.ex. "Har du redan ett konto?")

#### Inloggningsfel
**Felaktiga uppgifter:**
- Tydligt meddelande: "E-postadressen eller lösenordet stämmer inte"
- Hjälpfull text: "Kom ihåg att lösenord är skiftlägeskänsliga"
- Synlig "Glömt lösenord?"-knapp direkt i felmeddelandet

**Nätverksfel:**
- Användarvettig förklaring: "Problem med internetanslutningen"
- Konkreta åtgärder: "Kontrollera din anslutning och försök igen"
- Eskaleringsväg: "Om problemet kvarstår, försök ladda om sidan"

**Obekräftad e-post:**
- Förklara vad som behöver göras
- Erbjud att skicka nytt bekräftelsemail
- Tydlig "Skicka nytt bekräftelsemail"-knapp

#### Tekniska fel
- Använd vardagligt språk
- Förklara vad som gick fel
- Ge konkreta nästa steg
- Erbjud kontaktväg vid behov

### Responsiv design

#### Mobil-första
- Knappar minst 44px höga för touch
- Tydlig hierarki på små skärmar
- Kortare texter på mobil
- Stackade CTA-knappar på små skärmar

#### Desktop
- Använd extra utrymme för förklarande text
- Sido-vid-sido layout för CTA-knappar
- Mer detaljerade progress-indikatorer

### A/B-test möjligheter

#### Landingssida
- Olika CTA-texter
- En vs två knappar
- Placering av hjälptext

#### Signup-flow
- Med vs utan progress-indikator
- Längd på förklarande text
- Timing för omdirigering

### Mätpunkter

#### Conversion funnel
1. Landing page view → Signup click
2. Signup page view → Form submit  
3. Account created → Email verified
4. Login → First handbook created

#### UX-kvalitet
- Time to first handbook created
- Support-tickets relaterade till onboarding
- User feedback på klarhet i processen 