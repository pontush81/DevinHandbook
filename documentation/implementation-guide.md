# Implementation Guide - Miljöstruktur Setup

## 🎯 Mål
Skapa en ren separation mellan development, staging och production med korrekt Stripe-konfiguration.

## ⚠️ Nuvarande Problem
Din produktion kör med `FORCE_STRIPE_TEST_MODE=true`, vilket gör att betalningar inte registreras korrekt.

## 🛠️ Lösning - Steg för Steg

### Steg 1: Kontrollera Nuvarande Status

```bash
# Kolla nuvarande produktionsstatus
curl -s https://www.handbok.org/api/debug/env-check | jq .

# Förväntat resultat: usingTestKeys: true (vilket är problemet)
```

### Steg 2: Förbered Stripe-nycklar

#### A) Hämta Test-nycklar (för staging)
1. Gå till [Stripe Dashboard](https://dashboard.stripe.com/) 
2. Växla till **Test mode** (toggle i övre höger hörn)
3. Gå till **Developers** → **API keys**
4. Kopiera:
   - `Publishable key` (pk_test_...)
   - `Secret key` (sk_test_...)

#### B) Hämta Live-nycklar (för produktion) 
1. I Stripe Dashboard, växla till **Live mode**
2. Gå till **Developers** → **API keys**  
3. Kopiera:
   - `Publishable key` (pk_live_...)
   - `Secret key` (sk_live_...)

### Steg 3: Konfigurera Webhooks

#### A) Staging Webhook (Test mode)
1. I Stripe Dashboard **Test mode**
2. Gå till **Developers** → **Webhooks**
3. Klicka **Add endpoint**
4. URL: `https://[din-staging-url]/api/stripe/webhook`
5. Events: 
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.created/updated/deleted`
6. Kopiera **Signing secret** (whsec_...)

#### B) Production Webhook (Live mode)
1. I Stripe Dashboard **Live mode**
2. Samma steg som ovan
3. URL: `https://www.handbok.org/api/stripe/webhook`
4. Kopiera **Signing secret** för produktion

### Steg 4: Uppdatera Vercel Environment Variables

#### A) Preview Environment (Staging)
```bash
# Gå till https://vercel.com/[ditt-team]/[projekt]/settings/environment-variables
# Välj "Preview" environment
```

Lägg till dessa variabler för **Preview**:
```env
STRIPE_SECRET_KEY_TEST=sk_test_...din_test_secret...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...din_staging_webhook_secret...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...din_test_publishable...
HANDBOOK_PRICE=1000
```

#### B) Production Environment
```bash
# Samma sida, välj "Production" environment
```

Uppdatera dessa variabler för **Production**:
```env
# TA BORT denna variabel helt:
FORCE_STRIPE_TEST_MODE

# LÄGG TILL eller UPPDATERA:
STRIPE_SECRET_KEY=sk_live_...din_live_secret...
STRIPE_WEBHOOK_SECRET=whsec_...din_production_webhook_secret...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...din_live_publishable...
HANDBOOK_PRICE=149000
```

### Steg 5: Deploy och Testa

#### A) Kommit uppdateringar
```bash
# Från din nuvarande branch
git add .
git commit -m "feat: Clean up Stripe environment configuration

- Remove FORCE_STRIPE_TEST_MODE logic
- Add proper environment detection (dev/staging/prod)
- Update debug endpoints for better visibility
- Add comprehensive environment setup documentation"

git push origin main
```

#### B) Vänta på deployment
```bash
# Vänta på Vercel deployment att slutföras
# Kontrollera via Vercel dashboard eller GitHub actions
```

#### C) Verifiera produktionsmiljö
```bash
# Kontrollera att produktionsmiljön nu använder live-nycklar
curl -s https://www.handbok.org/api/debug/env-check | jq .

# Förväntat resultat:
# {
#   "environment": {
#     "currentEnvironment": "production"
#   },
#   "stripe": {
#     "usingTestKeys": false,
#     "keyValidation": {
#       "secretKeyType": "LIVE"
#     }
#   },
#   "status": {
#     "readyForPayments": true
#   }
# }
```

### Steg 6: Testa Betalningsflödet

#### A) Test i staging (om du har staging-miljö)
1. Gör en commit till `staging` branch
2. Testa med Stripe test-kort: `4242 4242 4242 4242`
3. Verifiera att webhook registreras

#### B) Test i produktion (med försiktighet)
1. Använd ett verkligt kort med lågt belopp
2. Kontrollera att handbok markeras som betald
3. Övervaka webhook-loggar

### Steg 7: Övervaka och Verifiera

```bash
# Kontinuerlig övervakning
watch -n 30 'curl -s https://www.handbok.org/api/debug/env-check | jq .status'

# Kontrollera webhook-status
curl -s https://www.handbok.org/api/debug/webhook-status | jq .
```

## 🔍 Troubleshooting

### Problem: "Webhook signature verification failed"
**Lösning**: Kontrollera att webhook secret matchar mellan Stripe och Vercel

### Problem: "Stripe not initialized"  
**Lösning**: Kontrollera att rätt secret key finns i miljövariablerna

### Problem: Felaktigt pris visas
**Lösning**: Kontrollera HANDBOOK_PRICE variabel för respektive miljö

## ✅ Kontrollista

- [ ] Test-nycklar kopierade från Stripe Dashboard
- [ ] Live-nycklar kopierade från Stripe Dashboard  
- [ ] Staging webhook skapad (test mode)
- [ ] Production webhook skapad (live mode)
- [ ] Vercel Preview environment konfigurerad
- [ ] Vercel Production environment uppdaterad
- [ ] FORCE_STRIPE_TEST_MODE borttagen
- [ ] Kod pushad och deployad
- [ ] Produktionsmiljö verifierad (live keys)
- [ ] Testbetalning genomförd
- [ ] Webhook-loggar kontrollerade

## 🎉 Slutresultat

Efter implementering får du:

- ✅ **Development**: localhost med Stripe CLI
- ✅ **Staging**: Preview deployments med test-nycklar
- ✅ **Production**: Live environment med riktiga betalningar  
- ✅ **Webhook**: Automatisk registrering av betalningar
- ✅ **Debug**: Tydlig miljövisibilitet via debug-endpoints

## 📞 Support

Om du stöter på problem:
1. Kontrollera debug-endpointen: `/api/debug/env-check`
2. Kolla Stripe Dashboard för webhook-loggar
3. Använd Vercel deployment-loggar för debugging 