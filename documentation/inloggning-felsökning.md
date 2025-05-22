# Felsökning av inloggning och sessionshantering

Detta dokument beskriver hur du kan felsöka och lösa problem med inloggning och sessionshantering i Handbok-applikationen.

## Vanliga problem och lösningar

### 1. "Access to storage is not allowed from this context"

Detta fel uppstår när applikationen försöker använda localStorage i en miljö där det inte är tillåtet, vanligtvis i en cross-domain kontext.

**Lösning:**
- Vi har helt eliminerat användningen av localStorage i applikationen
- All sessionshantering sker nu via cookies som hanteras av Supabase
- Kontrollera att `storage: null` är satt i Supabase-konfigurationen för att tvinga användning av cookies

### 2. "Invalid Refresh Token: Refresh Token Not Found"

Detta fel inträffar när applikationen försöker förnya en session men refresh token saknas eller är ogiltig.

**Lösning:**
- Kontrollera att cookies är aktiverade i webbläsaren
- Rensa webbläsarens cookies och logga in på nytt
- Vi har implementerat en SessionResetNotice-komponent som visar användaren ett meddelande och ger möjlighet att rensa sessionen
- Retry-logiken har begränsats för att undvika DOS-attack mot Supabase

### 3. Användare blir automatiskt utloggade efter omdirigering

**Lösning:**
- Vi har lagt till fördröjningar före omdirigeringar (800ms) för att ge cookies tid att etableras
- Använder window.location.href istället för router.push för fullständiga sidomladdningar när cookies behöver överföras
- Implementerat polling för att kontrollera sessionsstatusen flera gånger med jämna intervall

## Diagnostikverktyg

För att underlätta felsökning har vi implementerat ett omfattande diagnostikverktyg:

1. **AuthDiagnosticsPanel**: En UI-komponent som visar detaljerad information om sessioner, cookies och nätverksanrop
   - Finns tillgänglig i utvecklingsmiljön (visas längst ner till höger)
   - Kan exportera all diagnostikdata som JSON för närmare analys

2. **Diagnostikinstrumentation**: Koden är instrumenterad med omfattande loggning för att spåra:
   - Cookie-förändringar
   - Sessionsförändringar
   - Nätverksbegäran till Supabase
   - Auth-events och fel

## Teknisk implementeringsöversikt

### Viktiga komponenter:

1. **AuthContext.tsx**: Hanterar sessionshantering och auth state
   - Använder Supabase cookies istället för localStorage
   - Implementerar robusta kontroller för sessionsvaliditet

2. **supabase.ts**: Konfigurerar Supabase-klienten
   - Sätter `storage: null` för att tvinga cookie-baserad lagring
   - Implementerar anpassad fetch-funktion med begränsad retry-logik

3. **SessionResetNotice.tsx**: Visar en notifiering när sessionsproblem upptäcks
   - Ger användaren möjlighet att rensa sessionen och börja om

4. **auth-diagnostics.ts**: Instrumentering för detaljerad loggning och felsökning
   - Spårar cookies, sessioner och nätverksanrop
   - Lagrar historik av händelser för analys

## Bästa praxis

1. **Använd alltid cookies istället för localStorage** för sessionshantering, särskilt i cross-domain-miljöer
2. **Lägg till tillräckliga fördröjningar** (500-800ms) före omdirigeringar efter inloggning/utloggning
3. **Implementera retry-logik med begränsningar** för att undvika DOS-attacker
4. **Använd polling-metoder med exponentiell backoff** istället för enkla timeouts
5. **Var noga med att rensa sessionsdata** vid utloggning och sessionsfel

## Felsökningsguide

Om du upplever inloggningsproblem:

1. Öppna utvecklarverktyg (F12) och kontrollera konsolen för felmeddelanden
2. Aktivera AuthDiagnosticsPanel för att spåra sessioner och cookies
3. Kontrollera Network-fliken i utvecklarverktyg för att se om auth-anrop lyckas
4. Verifiera att cookies sätts korrekt under domänen
5. Kontrollera att SameSite och Secure attribut är korrekt inställda på cookies

För kritiska produktionsproblem, kontakta utvecklingsteamet med följande information:
- Exporterad diagnostikdata från AuthDiagnosticsPanel
- Skärmdumpar av felmeddelanden
- Beskrivning av stegen som ledde till problemet 