# Stripe Testläge - Konfigurationsguide

För att använda Stripe i testläge istället för skarpt läge behöver du ändra API-nycklarna i din `.env.local` fil. Följ dessa steg:

## 1. Hämta dina Stripe testnyckar

1. Logga in på ditt [Stripe-konto](https://dashboard.stripe.com/)
2. Kontrollera att du är i **Test Mode** (växla via knappen i övre högra hörnet)
3. Gå till [API-keys](https://dashboard.stripe.com/test/apikeys)
4. Här hittar du:
   - **Publishable key** (börjar med `pk_test_`)
   - **Secret key** (börjar med `sk_test_`)

## 2. Skapa din Stripe webhook för testmiljön

1. Gå till [Webhooks](https://dashboard.stripe.com/test/webhooks) i Stripe-dashboarden
2. Klicka på "Add endpoint"
3. Ange din webhook URL (t.ex. `https://din-test-app.vercel.app/api/stripe/webhook` eller använd [Stripe CLI](https://stripe.com/docs/stripe-cli) för lokal utveckling)
4. Välj de events du behöver lyssna på (minst `checkout.session.completed`)
5. Kopiera "Signing secret" som skapas

## 3. Uppdatera din `.env.local` fil

Ändra följande variabler i din `.env.local` fil:

```
# Stripe Variables
STRIPE_SECRET_KEY=sk_test_...din_test_secret_key...
STRIPE_WEBHOOK_SECRET=whsec_...din_test_webhook_secret...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...din_test_publishable_key...
```

## 4. Testa betalningar

I testläge kan du använda följande testkort:
- **Kort nummer:** 4242 4242 4242 4242
- **Utgångsdatum:** Valfritt framtida datum
- **CVC:** Valfria 3 siffror
- **Postnummer:** Valfria 5 siffror

## 5. Andra testkortnummer

| Kortnummer | Beskrivning |
|------------|-------------|
| 4242 4242 4242 4242 | Betalning lyckas |
| 4000 0000 0000 0002 | Betalning nekas |
| 4000 0000 0000 3220 | 3D Secure 2 authentication |

För fler testkortnummer och testresurser, se [Stripe's testdokumentation](https://stripe.com/docs/testing).

## Viktigt att tänka på

- Alla transaktioner i testläge är fiktiva och inga riktiga pengar överförs
- Dubbelkolla alltid att du är i testläge i Stripe-dashboarden (grå bakgrund med "TEST" indikator)
- Innan du går i produktion, se till att byta till skarpa nycklar i din `.env.local` fil 