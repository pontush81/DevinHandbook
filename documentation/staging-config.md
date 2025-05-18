# Staging-miljö konfiguration

Denna dokumentation innehåller instruktioner för att konfigurera staging-miljön för att testa betalningsflödet med riktiga kort men med lägre belopp.

## Miljövariabler för Vercel (staging)

När du skapar en preview/staging-miljö i Vercel, lägg till följande miljövariabler:

```
# Supabase Variables
# (Använd samma som i produktionsmiljön eller specifika testmiljö-variabler)
NEXT_PUBLIC_SUPABASE_URL=https://yourprojectid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Variables 
# (Använd STRIPE_SECRET_KEY_TEST för staging, aldrig produktionsnycklar)
STRIPE_SECRET_KEY_TEST=your-stripe-test-secret-key
STRIPE_WEBHOOK_SECRET_TEST=your-stripe-test-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=your-stripe-test-publishable-key

# Sätt priset till 10 kr (1000 öre) för staging-miljön
HANDBOOK_PRICE=1000

# Application Variables
NEXT_PUBLIC_APP_URL=https://staging-devin-handbook.vercel.app
NEXT_PUBLIC_BASE_URL=https://staging-devin-handbook.vercel.app
NEXT_PUBLIC_SITE_URL=https://staging-devin-handbook.vercel.app
NEXT_PUBLIC_APP_DOMAIN=handbok.org
NEXT_PUBLIC_HANDBOOK_DOMAIN=handbok.org
```

## Vercel Preview-miljö

För att skapa en preview-miljö i Vercel:

1. Pusha `staging`-branchen till GitHub
2. Vercel kommer automatiskt att skapa en preview-deployment för varje push till denna branch
3. Konfigurera miljövariablerna enligt ovan i Vercel-projektets inställningar för preview-miljöer
4. Verifiera att priset visas som 10 kr i betalningsflödet
5. Testa betalningsflödet med ett Stripe-testkort (t.ex. 4242 4242 4242 4242)

## Lokalt utveckling med staging-konfiguration

För att utveckla lokalt med staging-konfiguration:

1. Kopiera innehållet ovan till en `.env.local` fil
2. Fyll i dina egna Supabase- och Stripe-testnycklar
3. Starta utvecklingsservern med `npm run dev`
4. Verifiera att priset visas som 10 kr i betalningsflödet

## Testning

Vid testning i staging-miljön:
- Använd endast Stripe-testkort
- Verifiera att varningsmeddelandet för testbelopp visas
- Kontrollera att webhooks fungerar korrekt
- Validera att hela kundresan fungerar från betalning till leverans av handbok 