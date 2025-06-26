# Miljökonfiguration - Development, Staging & Production

## Översikt

Vi använder tre separata miljöer med tydlig separation av Stripe-konfiguration:

- **Development** (localhost:3000) - Test-nycklar + Stripe CLI
- **Staging** (preview deployments) - Test-nycklar + Test webhooks  
- **Production** (www.handbok.org) - Live-nycklar + Live webhooks

## Git Branch Strategy

```
main          -> Production (www.handbok.org)
staging       -> Staging (preview deployments)
feature/*     -> Development (localhost:3000)
```

## Miljövariabel-konfiguration

### Development (.env.local)

```env
# Supabase (kan vara samma som staging)
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Test Keys (för lokal utveckling)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...från_stripe_cli...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

# Prisstruktur för utveckling
HANDBOOK_PRICE=1000  # 10 kr för testning

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Staging (Vercel Preview Environment)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Test Keys (samma som dev men med webhook endpoint)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...från_staging_webhook...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

# Prisstruktur för staging
HANDBOOK_PRICE=1000  # 10 kr för testning

# App URLs (dynamiska för preview)
NEXT_PUBLIC_APP_URL=https://staging-devin-handbook.vercel.app
NEXT_PUBLIC_BASE_URL=https://staging-devin-handbook.vercel.app
NEXT_PUBLIC_SITE_URL=https://staging-devin-handbook.vercel.app
```

### Production (Vercel Production Environment)

```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Stripe Live Keys (RIKTIGA NYCKLAR)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...från_production_webhook...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Prisstruktur för produktion
HANDBOOK_PRICE=249000  # 2490 kr

# App URLs
NEXT_PUBLIC_APP_URL=https://www.handbok.org
NEXT_PUBLIC_BASE_URL=https://www.handbok.org
NEXT_PUBLIC_SITE_URL=https://www.handbok.org
```

## Stripe Webhook Konfiguration

### Development
- Använd `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Automatisk webhook secret från CLI

### Staging
- Stripe Dashboard → Test Mode → Webhooks
- Endpoint: `https://[preview-url].vercel.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, etc.

### Production  
- Stripe Dashboard → Live Mode → Webhooks
- Endpoint: `https://www.handbok.org/api/stripe/webhook`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, etc.

## Deployment Workflow

### 1. Utveckling
```bash
# Starta lokal utveckling
npm run dev

# Starta Stripe CLI (separat terminal)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 2. Staging Deploy
```bash
# Växla till staging branch
git checkout staging

# Merga från main eller feature branch
git merge main

# Pusha för att triggra preview deployment
git push origin staging
```

### 3. Production Deploy
```bash
# Växla till main branch
git checkout main

# Merga från staging (efter testning)
git merge staging

# Pusha för production deploy
git push origin main
```

## Vercel Environment Configuration

### Preview Environment (Staging)
- Går till: `https://vercel.com/your-project/settings/environment-variables`
- Välj "Preview" environment
- Lägg till alla staging-variabler

### Production Environment
- Samma sida, välj "Production" environment  
- Lägg till alla production-variabler
- **VIKTIGT**: Använd riktiga live-nycklar här

## Säkerhetsriktlinjer

### ✅ Gör detta:
- Använd separata webhook endpoints för varje miljö
- Håll live-nycklar separata från test-nycklar
- Testa alltid i staging innan production
- Logga miljö-information för debugging

### ❌ Gör INTE detta:
- Blanda test och live nycklar
- Använd samma webhook för flera miljöer
- Skicka live-nycklar till utvecklare
- Committa nycklar till Git

## Troubleshooting

### Kontrollera miljö
```bash
# Lokal miljö
curl http://localhost:3000/api/debug/env-check

# Staging miljö  
curl https://[preview-url].vercel.app/api/debug/env-check

# Production miljö
curl https://www.handbok.org/api/debug/env-check
```

### Vanliga problem

**Problem**: Webhook fungerar lokalt men inte i staging/production
**Lösning**: Kontrollera att webhook endpoint är korrekt konfigurerad i Stripe Dashboard

**Problem**: Betalningar går igenom men registreras inte
**Lösning**: Verifiera att webhook secret matchar mellan Stripe och miljövariabel

**Problem**: Fel priser visas
**Lösning**: Kontrollera HANDBOOK_PRICE variabel för respektive miljö

## Sammanfattning

Med denna setup får du:
- ✅ Tydlig separation mellan miljöer
- ✅ Säker hantering av Stripe-nycklar  
- ✅ Testbar staging-miljö
- ✅ Professionell produktionsmiljö
- ✅ Enkel deployment-process 