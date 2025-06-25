# Stripe Webhook Konfigurationsguide

## Översikt

För att säkerställa att betalningar registreras automatiskt måste Stripe webhooks vara korrekt konfigurerade. Detta dokument beskriver hur du ställer in webhooks för både utveckling och produktion.

## Problemet vi löser

Utan korrekt webhook-konfiguration:
- ❌ Betalningar genomförs i Stripe men handboken förblir i trial-läge
- ❌ Användare betalar men får inte tillgång till sina handböcker
- ❌ Manuell intervention krävs för varje betalning

Med korrekt webhook-konfiguration:
- ✅ Betalningar registreras automatiskt
- ✅ Handböcker aktiveras omedelbart efter betalning
- ✅ Användare får tillgång direkt efter betalning

## Utvecklingsmiljö (Lokal)

### 1. Installera Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (via Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget -O - https://packages.stripe.dev/api/security/keypairs/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

### 2. Logga in på Stripe

```bash
stripe login
```

### 3. Starta webhook forwarding

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 4. Kopiera webhook secret

Stripe CLI kommer att visa en webhook secret som börjar med `whsec_`. Kopiera denna och lägg till i din `.env.local`:

```env
STRIPE_WEBHOOK_SECRET_TEST=whsec_1234567890abcdef...
```

### 5. Testa webhook

```bash
# I en annan terminal
stripe trigger checkout.session.completed
```

## Produktionsmiljö

### 1. Gå till Stripe Dashboard

1. Logga in på [Stripe Dashboard](https://dashboard.stripe.com/)
2. Gå till **Developers** → **Webhooks**
3. Klicka på **Add endpoint**

### 2. Konfigurera webhook endpoint

- **Endpoint URL**: `https://handbok.org/api/stripe/webhook`
- **Description**: `Handbok.org Production Webhooks`
- **Version**: `Latest API version`

### 3. Välj events

Lägg till följande kritiska events:
- ✅ `checkout.session.completed` (KRITISK för betalningar)
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

### 4. Kopiera webhook secret

1. Klicka på den skapade webhook endpointen
2. Gå till **Signing secret** sektionen
3. Klicka **Reveal** och kopiera hemligheten
4. Lägg till i Vercel miljövariabler:

```env
STRIPE_WEBHOOK_SECRET=whsec_production_secret_here...
```

## Staging/Preview-miljö

För staging-miljön (t.ex. `staging-handbok.vercel.app`):

1. Skapa en separat webhook endpoint i Stripe
2. **Endpoint URL**: `https://staging-handbok.vercel.app/api/stripe/webhook`
3. Använd samma events som produktionsmiljön
4. Lägg till webhook secret som `STRIPE_WEBHOOK_SECRET_TEST` i Vercel preview environment

## Verifiering av webhook-konfiguration

### 1. Kontrollera att webhook secret finns

```bash
# Lokal utveckling
echo $STRIPE_WEBHOOK_SECRET_TEST

# Eller i Node.js
console.log('Webhook secret exists:', !!process.env.STRIPE_WEBHOOK_SECRET_TEST);
```

### 2. Testa webhook endpoint

```bash
# Testa att endpointen svarar
curl -X POST https://handbok.org/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"test": true}'
```

### 3. Övervaka webhook-loggar

Använd debug-endpointen för att övervaka webhook-status:

```bash
curl https://handbok.org/api/debug/webhook-status
```

## Fallback-system

Som backup har vi implementerat ett fallback-system som automatiskt verifierar betalningar:

### 1. Automatisk verifiering efter 5 minuter

När en Stripe session skapas startar en timer som kontrollerar betalningsstatus efter 5 minuter. Om webhook misslyckades körs betalningslogiken manuellt.

### 2. Omedelbar verifiering på success-sidan

När användaren kommer till `/upgrade-success` sidan verifieras betalningen omedelbart och bearbetas om webhook misslyckades.

### 3. Manuell debug-knapp

Superadmins kan använda debug-panelen för att manuellt köra webhook-logik för specifika handböcker.

## Felsökning

### Vanliga problem och lösningar

#### Webhook secret saknas
```
❌ Error: Missing stripe-signature header
✅ Lösning: Kontrollera att STRIPE_WEBHOOK_SECRET är konfigurerad
```

#### Webhook endpoint inte nåbar
```
❌ Error: Webhook endpoint returned 404
✅ Lösning: Kontrollera att URL:en är korrekt i Stripe Dashboard
```

#### Events kommer inte fram
```
❌ Betalningar registreras inte automatiskt
✅ Lösning: Kontrollera att checkout.session.completed event är aktiverat
```

#### SSL-certifikat problem
```
❌ Error: SSL verification failed
✅ Lösning: Kontrollera att SSL-certifikatet är giltigt för domänen
```

### Debug-kommandon

```bash
# Kontrollera webhook endpoints i Stripe
stripe webhooks list

# Testa webhook lokalt
stripe listen --forward-to localhost:3000/api/stripe/webhook --log-level debug

# Simulera events
stripe trigger checkout.session.completed

# Kontrollera webhook-loggar
curl https://handbok.org/api/debug/webhook-status | jq
```

## Säkerhetsaspekter

1. **Webhook secrets**: Håll alltid webhook secrets hemliga och roterar dem regelbundet
2. **Endpoint säkerhet**: Webhook endpoint bör endast acceptera POST-anrop från Stripe
3. **Signaturverifiering**: Verifiera alltid Stripe-signaturer innan bearbetning
4. **Rate limiting**: Implementera rate limiting för webhook endpoints
5. **Logging**: Logga alla webhook-anrop för audit och debugging

## Övervakning

### Rekommenderade alerts

1. **Webhook failure rate > 5%**: Indikerar konfigurationsproblem
2. **No webhooks received in 1 hour**: Indikerar anslutningsproblem
3. **Payment verification fallbacks**: Indikerar webhook-problem

### Metrics att övervaka

- Webhook success rate
- Webhook processing time
- Fallback activation rate
- Payment verification failures

## Sammanfattning

✅ **Utveckling**: Använd Stripe CLI för lokal webhook forwarding
✅ **Staging**: Konfigurera separat webhook endpoint för preview-miljö
✅ **Produktion**: Konfigurera webhook endpoint med korrekt URL och events
✅ **Fallback**: Automatisk verifiering säkerställer att betalningar aldrig missas
✅ **Övervakning**: Debug-endpoints för att övervaka webhook-hälsa

Med denna konfiguration kommer betalningar att registreras automatiskt och användare får omedelbar tillgång till sina handböcker efter betalning. 