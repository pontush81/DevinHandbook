# Stripe Miljö-hantering

## Automatisk miljöanpassning av Stripe-länkar

### Problem som löstes:
Tidigare pekade admin-länken alltid på Stripe test-miljö (`/test/products`), vilket skulle vara fel i produktion.

### Lösning:
Dynamisk URL-generering baserat på miljövariabler.

## Hur det fungerar:

### 🔧 **Miljödetektering:**
```typescript
const getStripeProductsUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
  const forceTestMode = process.env.FORCE_STRIPE_TEST_MODE === 'true';
  
  // Använd test-miljö om vi inte är i produktion eller om testläge är påtvingat
  const useTestMode = !isProduction || forceTestMode;
  
  return useTestMode 
    ? 'https://dashboard.stripe.com/test/products'
    : 'https://dashboard.stripe.com/products';
};
```

### 🎯 **Miljöer och URLs:**

| Miljö | NODE_ENV | VERCEL_ENV | FORCE_STRIPE_TEST_MODE | URL |
|-------|----------|------------|------------------------|-----|
| **Lokal utveckling** | `development` | - | - | `dashboard.stripe.com/test/products` |
| **Vercel Preview** | `production` | `preview` | - | `dashboard.stripe.com/test/products` |
| **Vercel Production** | `production` | `production` | `false` | `dashboard.stripe.com/products` |
| **Tvingad testmiljö** | `production` | `production` | `true` | `dashboard.stripe.com/test/products` |

### 📱 **Visuell indikator:**
Länktexten visar tydligt vilken miljö som används:
- **"Priser (Stripe Test)"** - För test-miljö
- **"Priser (Stripe Live)"** - För produktionsmiljö

## Användning:

### 🧪 **Under utveckling:**
- Länken pekar automatiskt på test-miljö
- Du ser "Priser (Stripe Test)" i admin-menyn
- Säkert att experimentera utan att påverka riktiga kunder

### 🚀 **I produktion:**
- Länken pekar automatiskt på live-miljö
- Du ser "Priser (Stripe Live)" i admin-menyn
- Direkt åtkomst till riktiga produkter och priser

### ⚙️ **Tvinga testmiljö i produktion:**
Om du behöver använda test-miljö även i produktion:
```bash
# Sätt miljövariabel
FORCE_STRIPE_TEST_MODE=true
```

## Säkerhetsaspekter:

### ✅ **Automatisk säkerhet:**
- Ingen risk att råka ändra live-priser under utveckling
- Tydlig visuell indikation av vilken miljö som används
- Konsistent med samma logik som används för Stripe API-nycklar

### 🔒 **Miljövariabler:**
Samma logik som används för:
- `STRIPE_SECRET_KEY` vs `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET` vs `STRIPE_WEBHOOK_SECRET_TEST`

## Fördelar:

### ✅ **Automatisk anpassning:**
- Ingen manuell konfiguration behövs
- Samma kod fungerar i alla miljöer
- Minskar risk för fel

### ✅ **Tydlig kommunikation:**
- Visuell indikation av miljö i länktext
- Ingen förvirring om vilken miljö som används
- Säker utveckling och produktion

### ✅ **Flexibilitet:**
- Möjlighet att tvinga testmiljö vid behov
- Enkelt att testa olika konfigurationer
- Konsistent med befintlig Stripe-konfiguration

## Framtida förbättringar:

### 🔄 **Potentiella tillägg:**
- Färgkodning av länken (grön för live, orange för test)
- Varningsmeddelande vid klick på live-miljö
- Automatisk uppdatering av länktext baserat på aktuell Stripe-konfiguration 