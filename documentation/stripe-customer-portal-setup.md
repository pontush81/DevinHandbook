# Stripe Kundportal - Konfigurationsguide

## Problem som löses

När utvecklingsappen försöker skapa en Stripe customer portal session kan följande fel uppstå:
- `No configuration provided and your test mode default configuration has not been created`
- `Customer exists in live mode but test mode key was used`

## Lösning 1: Konfigurera Stripe Kundportal i Testläge

### Steg 1: Logga in på Stripe Dashboard

1. Gå till [Stripe Dashboard](https://dashboard.stripe.com/)
2. **VIKTIGT**: Se till att du är i **Test Mode** (växla via knappen i övre högra hörnet)
3. Dashboarden ska ha grå bakgrund med "TEST DATA" indikator

### Steg 2: Konfigurera Kundportalen

1. Navigera till [Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal) (testläge)
2. Klicka på **"Activate Customer Portal"** eller **"Get started"**
3. Konfigurera följande inställningar:

#### Grundläggande inställningar:
- **Business information**: Fyll i företagsnamn och webbplats
- **Customer support**: Lägg till support e-post och telefonnummer
- **Brand**: Ladda upp logotyp och välj färger (valfritt)

#### Funktionalitet:
- ✅ **Update payment methods** (Uppdatera betalmetoder)
- ✅ **Download invoices** (Ladda ner fakturor)
- ✅ **Cancel subscriptions** (Säg upp prenumerationer)
- ✅ **Update billing information** (Uppdatera faktureringsinformation)

### Steg 3: Spara konfigurationen

1. Klicka **"Save configuration"**
2. Du får en bekräftelse att portalen är aktiverad

### Steg 4: Testa konfigurationen

Nu ska din utvecklingsapp kunna skapa portal-sessioner utan fel.

## Lösning 2: Utvecklingsmiljö med Testdata

### Skapa test-kunder och prenumerationer

För att undvika problem med produktionsdata i utvecklingsmiljö:

1. **Skapa testkund**:
```bash
# Via Stripe CLI (rekommenderat)
stripe customers create \
  --email="test@example.com" \
  --name="Test User" \
  --description="Development test customer"
```

2. **Skapa test-prenumeration**:
```bash
# Först skapa en produkt och pris
stripe products create --name="Handbok Test"
stripe prices create \
  --product={{PRODUCT_ID}} \
  --unit-amount=1000 \
  --currency=sek \
  --recurring-interval=month
  
# Sedan skapa prenumeration
stripe subscriptions create \
  --customer={{CUSTOMER_ID}} \
  --items[0][price]={{PRICE_ID}}
```

3. **Uppdatera utvecklingsdatabasen** med test-customer-id:n

## Lösning 3: Miljöspecifik hantering

### Lägg till miljöcheck i utveckling

För att göra utvecklingsmiljön mer robust kan du:

```typescript
// I din API-route
if (process.env.NODE_ENV === 'development') {
  // Skapa en test-customer automatiskt om ingen finns
  // Eller returnera en user-friendly utvecklings-meddelande
}
```

## Verifiering

### Kontrollera att det fungerar:

1. Gå till din utvecklingsapp
2. Navigera till inställningssidan  
3. Klicka på "Hantera prenumeration"
4. Du ska nu omdirigeras till Stripe customer portal utan fel

### Förväntade resultat:

- ✅ Ingen `404` fel från `/api/stripe/create-portal-session`
- ✅ Omdirigering till Stripe customer portal
- ✅ Fungerande portal med dina konfigurerade funktioner

## Felsökning

### Om det fortfarande inte fungerar:

1. **Kontrollera API-nycklar**:
```bash
npm run check-stripe
```

2. **Verifiera testläge**:
   - Dashboard ska visa "TEST DATA"
   - API-nycklar ska börja med `sk_test_` och `pk_test_`

3. **Kontrollera customer portal URL**:
   - [Test mode portal settings](https://dashboard.stripe.com/test/settings/billing/portal)
   - Ska visa "Active" status

4. **Loggar**:
   - Kontrollera Next.js konsol för detaljerade felmeddelanden
   - Stripe dashboard visar API-anrop under "Logs"

## Produktion

När du går live:

1. Upprepa samma process i **Live Mode**
2. Konfigurera kundportalen med produktionsinställningar
3. Uppdatera miljövariabler till live-nycklar
4. Testa med riktiga betalningar först

## Kontakt

Om problem kvarstår:
- Kontrollera Stripe dokumentation: https://stripe.com/docs/billing/subscriptions/customer-portal
- Kontakta utvecklingsteamet med felloggar 