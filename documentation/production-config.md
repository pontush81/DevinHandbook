# Produktionsmiljö konfiguration

Denna dokumentation innehåller instruktioner för att konfigurera produktionsmiljön för skarpa betalningar.

## Miljövariabler för Vercel (produktion)

När du konfigurerar produktionsmiljön i Vercel, lägg till följande miljövariabler:

```
# Supabase Variables
NEXT_PUBLIC_SUPABASE_URL=https://yourprojectid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Stripe Variables (Skarpa produktionsnycklar)
STRIPE_SECRET_KEY=your-stripe-live-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-live-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-live-publishable-key

# Sätt fullt pris till 2490 kr (249000 öre) för produktionsmiljön
# Om du tillfälligt vill testa betalflödet med minimal kostnad, 
# sätt HANDBOOK_PRICE=300 vilket är 3 kr (Stripes minimigräns)
HANDBOOK_PRICE=249000

# Application Variables
NEXT_PUBLIC_APP_URL=https://handbok.org
NEXT_PUBLIC_BASE_URL=https://handbok.org
NEXT_PUBLIC_SITE_URL=https://handbok.org
NEXT_PUBLIC_APP_DOMAIN=handbok.org
NEXT_PUBLIC_HANDBOOK_DOMAIN=handbok.org
```

## Vercel produktionsdeploy

För produktionsdeploy:

1. Testa först i staging-miljön (se staging-config.md)
2. När allt fungerar som det ska, merga `staging` till `main`
3. Pusha `main`-branchen till GitHub
4. Vercel kommer automatiskt att skapa en produktions-deployment
5. Verifiera att miljövariablerna är korrekt konfigurerade i Vercel-projektets inställningar för produktionsmiljön
6. Dubbelkolla att priset visas som 2490 kr i betalningsflödet
7. Övervaka att betalningar och webhooks fungerar korrekt

## Temporär testning i produktion

För att temporärt testa betalningsflödet i produktion med minimal kostnad:

1. Ändra tillfälligt `HANDBOOK_PRICE` till `300` (3 kr) i Vercel's miljövariabler
2. Testa att skapa en handbok med det lägre priset
3. Verifiera att betalningsflödet fungerar
4. Kontrollera att handboken skapas korrekt efter betalning
5. När testningen är klar, ändra tillbaka `HANDBOOK_PRICE` till `249000` (2490 kr)

**VIKTIGT:** När du väl har verifierat betalningsflödet, ändra omedelbart tillbaka till det fulla priset för att undvika förlorade intäkter.

## Kontrollista före produktionsdeploy

- [ ] Testat all funktionalitet i staging-miljön
- [ ] Verifierat att alla Stripe-webhooks fungerar korrekt
- [ ] Kontrollerat att korrekt API-version används i Stripe-integreringen
- [ ] Alla temporära testfunktioner är borttagna eller inaktiva
- [ ] Rätt URL:er och domäner är konfigurerade
- [ ] SSL-certifikat är korrekt konfigurerade för både huvuddomän och subdomäner 