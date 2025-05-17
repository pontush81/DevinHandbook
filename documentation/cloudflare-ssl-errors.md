# Hantering av Cloudflare SSL-valideringsfel (Error 526)

## Problembeskrivning

Detta dokument beskriver hur vi hanterar Cloudflare SSL-valideringsfel (Error 526) när vi ansluter till Supabase från vår Next.js-applikation.

### Vad är Error 526?

Error 526 (Invalid SSL Certificate) inträffar när Cloudflare inte kan validera SSL-certifikatet på din ursprungsserver, i det här fallet Supabase. Detta fel kan uppstå av flera anledningar:

1. SSL-certifikatet på Supabase-projektet är ogiltigt eller har gått ut
2. Certifikatet är utfärdat för fel domännamn
3. Certifikatet är självsignerat eller kommer från en certifikatutfärdare som inte är betrodd av Cloudflare
4. Supabase-projektet är pausat eller har någon annan driftstörning

## Vår lösning

Vi har implementerat en robust lösningsstrategi för att hantera detta problem:

### 1. SmartSupabaseClient

Vi använder en anpassad `SmartSupabaseClient`-klass som automatiskt hanterar anslutningsproblem:

- Försöker först med direktanslutning till Supabase
- Fallbackar automatiskt till en proxy-anslutning om direktanslutningen misslyckas
- Detekterar Cloudflare SSL-problem och anpassar beteendet därefter
- Använder exponentiell backoff för återförsök
- Underhåller statusinformation om anslutningens hälsa

### 2. Server-side proxy

För att kringgå SSL-problem i Edge Runtime eller när Supabase har tillfälliga SSL-problem, har vi implementerat:

- En server-side proxy endpoint (`/api/supabase-proxy`)
- Specialiserad SSL-felhantering
- Robusta återförsöksmekanismer

### 3. Diagnostiska verktyg

Vi har flera diagnostiska endpoints för att identifiera problemet:

- `/api/cloudflare-check` - Analyserar om problemet är relaterat till Cloudflare
- `/api/test-ssl` - Testar SSL-anslutning till Supabase
- `/api/supabase-diagnosis` - Kör en fullständig diagnos av Supabase-anslutningen
- Diagnostik inbyggd i SmartSupabaseClient

### 4. React Hook: useSmartSupabase

För React-komponenter tillhandahåller vi en hook som:

- Förenklar användningen av SmartSupabaseClient
- Hanterar anslutningsstatus och felmeddelanden
- Kör automatiska hälsokontroller
- Tillhandahåller konsekvent API för dataoperationer

## Felsökning

Om du stöter på Cloudflare SSL-fel (Error 526), följ dessa steg:

### 1. Kontrollera ditt Supabase-projekt

1. Besök [Supabase Dashboard](https://app.supabase.io)
2. Verifiera att ditt projekt är aktivt (inte pausat)
3. Kontrollera projektets hälsostatus
4. Om projektet verkar normalt, kontakta Supabase support angående SSL-certifikatproblem

### 2. Diagnostisera med våra verktyg

```javascript
// På serversidan
import { getSmartClient } from '@/lib/smart-supabase-client';

const client = getSmartClient();
const diagnostics = await client.diagnose();
console.log('Supabase diagnostik:', diagnostics);

// I React-komponenter
import { useSmartSupabase } from '@/lib/hooks/useSmartSupabase';

function MyComponent() {
  const { status, runDiagnostics, select } = useSmartSupabase();
  
  useEffect(() => {
    if (status.cloudflareIssueDetected) {
      console.warn('Cloudflare SSL-problem upptäckt:', status);
    }
  }, [status]);
  
  // Komponenten använder select, insert, update etc. som vanligt
}
```

### 3. Möjliga åtgärder

- **Tillfälligt problem**: Vår SmartSupabaseClient hanterar detta automatiskt genom att försöka igen senare
- **Långvarigt problem**: Kontakta Supabase support eller överväg att:
  - Pausa och starta om ditt Supabase-projekt
  - Skapa ett nytt Supabase-projekt och migrera dina data
  - Kontrollera om regionen du valt har kända problem

## Teknisk implementation

### Prioriterad anslutningsordning

1. **Direktanslutning** via `@supabase/postgrest-js` - Generellt snabbast och mest pålitlig när den fungerar
2. **Server-side proxy** via `/api/supabase-proxy` - Fungerar när direktanslutning misslyckas på grund av SSL/Cloudflare-problem

### Konfigurationsparametrar

Viktiga miljövariabler:

- `NEXT_PUBLIC_SUPABASE_URL` - URL till Supabase-projektet (måste vara HTTPS)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonym API-nyckel för klientsidan
- `SUPABASE_SERVICE_ROLE_KEY` - Service role-nyckel för server-side operationer (används av proxyn)
- `DEBUG_SUPABASE` - Sätt till "true" för utökad loggning (endast utvecklingsmiljö)

## Sammanfattning

Vår implementation skapar en robust anslutning till Supabase som är resilient mot Cloudflare SSL-valideringsfel genom att:

1. Detektera när SSL-problem uppstår
2. Automatiskt fallbacka till proxy-mode när det behövs
3. Försöka direkt anslutning igen periodiskt
4. Tillhandahålla omfattande diagnostiska verktyg
5. Skapa en konsistent upplevelse för utvecklare och slutanvändare 