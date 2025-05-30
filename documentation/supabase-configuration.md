# Supabase Konfiguration och Felsökning

Detta dokument beskriver hur Supabase är konfigurerat i projektet och hur du kan lösa vanliga problem med anslutningen.

## Grundläggande konfiguration

Applikationen använder följande miljövariabler för Supabase-anslutning:

```
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Viktigt:** Supabase URL måste börja med `https://`. Om den inte gör det, kör skriptet `node check-supabase-config.js` för att korrigera formatet.

## Anslutningsmetoder

Projektet använder tre olika metoder för att ansluta till Supabase:

1. **Direktanslutning (client-side)** - Använder @supabase/supabase-js klienten direkt från frontend-koden.
2. **Edge Runtime-anslutning** - För vissa API-endpoints som körs i Vercel Edge Runtime.
3. **Serverless Proxy** - Använder en serverless funktion som proxy för anslutning till Supabase, vilket kringgår begränsningar i Edge Runtime.

## Använda Proxy-klienten

Om du upplever problem med direktanslutningar till Supabase, använd den inbyggda proxy-klienten:

```typescript
import { SupabaseProxyClient } from '@/lib/supabase-proxy-client';

// Skapa klienten
const supabase = new SupabaseProxyClient();

// Använd den som en vanlig Supabase-klient (med något begränsad funktionalitet)
const { data, error } = await supabase.select('din_tabell', { limit: 10 });
```

## Felsökningsverktyg

Vi har flera verktyg för att felsöka Supabase-anslutningsproblem:

1. **Diagnostiksidan** - Besök `/supabase-test` för en fullständig diagnostikrapport.
2. **Proxy-testare** - Besök `/proxy-test` för att testa anslutning via serverless-proxyn.
3. **SSL-testare** - Besök `/api/test-ssl` för att diagnostisera SSL-relaterade problem med Supabase.
4. **API-endpoints**:
   - `/api/supabase-diagnosis` - Kör diagnostik på serversidan
   - `/api/test-direct` - Testar direktanslutning från servern

## Vanliga problem och lösningar

### "TypeError: fetch failed"

Detta fel uppstår vanligtvis när:

1. **URL-format** - Supabase URL saknar `https://` prefixet.
2. **Nätverksproblem** - API-servern kan inte nå Supabase-URL:en.
3. **Miljövariabelproblem** - Miljövariablerna är inte korrekt konfigurerade i Vercel.

### Cloudflare SSL-fel (Error 526)

Detta är ett vanligt problem när Cloudflare inte kan verifiera SSL-certifikatet för din Supabase-instans.

**Diagnostisera:**
1. Kör `/api/test-ssl` för att bekräfta problemet
2. Kontrollera om du ser statuscode 526 i svaret

**Lösningar:**
1. **Vänta en stund** - Problemet är ofta tillfälligt och löses när Supabase förnyar sitt SSL-certifikat
2. **Kontrollera projektstatus** - Gå till Supabase-konsolen och verifiera att ditt projekt är aktivt
3. **Kontakta Supabase-support** - Om problemet kvarstår

**Temporär lösning:**
Använd SupabaseProxyClient som är konfigurerad att hantera dessa fel bättre än direktanslutningen.

### Anslutning fungerar lokalt men inte i produktion

1. Kontrollera att miljövariablerna är korrekt konfigurerade i Vercel.
2. Testa med `/api/supabase-diagnosis` för att se detaljerade felmeddelanden.
3. Använd proxy-klienten istället för direktanslutning på produktionsmiljön.

### CORS-fel

Om du får CORS-relaterade fel, kontrollera:

1. Att din app anropar rätt domän (https://din-projekt-id.supabase.co).
2. Att Supabase är konfigurerat med rätt URL i projektinställningarna.
3. Att du använder proxy-klienten för att kringgå CORS-problem.

## Prestandaöverväganden

- Direktanslutning är snabbast när den fungerar.
- Proxy-anslutning lägger till en liten overhead men är mer tillförlitlig.
- För känsliga operationer (admin-åtkomst), använd alltid serverless-funktioner.

## Kontinuerlig övervakning

Kör regelbundet `/api/supabase-diagnosis` för att övervaka anslutningen till Supabase och snabbt upptäcka eventuella problem.

## Supabase Projektunderhåll

Om du upplever återkommande problem med SSL eller anslutningar, kan det bero på att din Supabase-instans behöver underhåll:

1. **Kontrollera projektets status** i Supabase-adminkonsolen
2. **Pausa och återaktivera projektet** för att åtgärda vissa anslutningsproblem
3. **Uppdatera projektet** till den senaste versionen om möjligt
4. **Kontrollera kvoteringsgränser** för att se om du nått någon begränsning 

## Anslutningsstrategier

För att förbättra pålitligheten i anslutningen till Supabase har vi implementerat flera olika strategier:

### 1. Direktanslutning (Primary)

Vår första anslutningsstrategi är att använda `@supabase/postgrest-js` för att koppla upp direkt mot Supabase REST API. Detta är den snabbaste och mest direkta metoden.

### 2. Proxy-anslutning (Fallback)

Om direktanslutningen misslyckas använder vi en serverless proxy-funktion som kör på Vercel för att vidarebefordra förfrågningar till Supabase. Denna metod kan hjälpa till att kringgå vissa nätverksproblem.

### 3. SmartClient (Automatisk)

`SmartSupabaseClient` kombinerar båda strategierna och försöker automatiskt använda den som fungerar. Den har inbyggd felhantering, återförsök och fallback-mekanismer.

## Testverktyg för anslutning

Vi har också byggt flera testendpoints för att hjälpa dig felsöka anslutningsproblem:

- `/api/test-direct` - Testar direktanslutning till Supabase
- `/api/test-proxy` - Testar proxy-anslutning till Supabase
- `/api/test-smart` - Testar SmartClient som automatiskt väljer bästa anslutningsmetod

## Frontend-användning

För att använda SmartClient i React-komponenter, använd vår anpassade hook:

```typescript
import { useSmartSupabase } from '@/lib/hooks/useSmartSupabase';

function MyComponent() {
  const { 
    data, 
    error, 
    isLoading, 
    source, // 'direct' eller 'proxy'
    refetch, 
    insert, 
    update, 
    remove 
  } = useSmartSupabase('handbooks', {
    limit: 10,
    columns: 'id,name,subdomain'
  });
  
  // Du kan använda data, error, isLoading etc. precis som med en vanlig fetch
  if (isLoading) return <div>Laddar...</div>;
  if (error) return <div>Fel: {error}</div>;
  
  return (
    <div>
      <p>Ansluten via: {source}</p>
      <ul>
        {data?.map(handbook => (
          <li key={handbook.id}>{handbook.name}</li>
        ))}
      </ul>
      <button onClick={refetch}>Uppdatera</button>
    </div>
  );
}
``` 