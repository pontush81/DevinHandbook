# Instruktioner för att skapa ABC-handboken

För att skapa en handbok med subdomän "abc" för testning, följ dessa steg:

## Alternativ 1: Använda create-handbook-prod.js

1. Se till att du har deployat den senaste versionen av applikationen till Vercel:
   ```bash
   npx vercel --prod
   ```

2. När deploymentet är klart, kör skriptet för att skapa handboken:
   ```bash
   export API_BASE_URL=https://handbok.org
   node scripts/create-handbook-prod.js abc "ABC Testhandbok"
   ```

3. Bekräfta att du vill skapa handboken genom att skriva "y" när du blir tillfrågad.

4. När processen är klar, bör du kunna besöka handboken på:
   ```
   https://abc.handbok.org
   ```

## Alternativ 2: Använda cURL direkt mot Supabase

Om du har problem med API-anropet, kan du skapa handboken direkt via Supabase REST API:

1. Hämta din Supabase URL och Service Role Key från Supabase-projektets inställningar.

2. Använd följande cURL-kommando:
   ```bash
   export SUPABASE_URL=https://your-project-id.supabase.co
   export SUPABASE_SERVICE_KEY=your-service-role-key

   curl -s -X POST "${SUPABASE_URL}/rest/v1/handbooks" \
     -H "apikey: ${SUPABASE_SERVICE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     -d '{"name":"ABC Testhandbok","subdomain":"abc","published":true}'
   ```

3. Skapa en sektion för handboken (anteckna handbook_id från föregående steg):
   ```bash
   curl -s -X POST "${SUPABASE_URL}/rest/v1/sections" \
     -H "apikey: ${SUPABASE_SERVICE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     -d '{"title":"Välkommen","description":"Välkommen till ABC-handboken","order":0,"handbook_id":"HANDBOOK_ID_HERE"}'
   ```

4. Skapa en sida i sektionen (anteckna section_id från föregående steg):
   ```bash
   curl -s -X POST "${SUPABASE_URL}/rest/v1/pages" \
     -H "apikey: ${SUPABASE_SERVICE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"title":"Startsida","content":"# Välkommen till ABC Testhandbok\n\nDetta är en testhandbok för subdomänfunktionaliteten.","order":0,"section_id":"SECTION_ID_HERE"}'
   ```

## Alternativ 3: Via Supabase Studio

Om du föredrar ett grafiskt gränssnitt:

1. Logga in på Supabase Studio för ditt projekt
2. Gå till "Table Editor" > "handbooks"
3. Klicka på "Insert Row" och lägg till:
   - name: "ABC Testhandbok"
   - subdomain: "abc"
   - published: true
4. Skapa motsvarande sektioner och sidor

## Felsökning

Om handboken har skapats men du inte kan komma åt den via subdomänen:

1. Kontrollera att DNS-inställningarna är korrekta och har propagerats
2. Verifiera att wildcarddomänen är korrekt konfigurerad i Vercel
3. Se till att Next.js rewrites är korrekt konfigurerade i next.config.js
4. Kontrollera Vercel-loggarna för eventuella fel

Kom ihåg att DNS-ändringar kan ta upp till 24-48 timmar att spridas fullt ut. 