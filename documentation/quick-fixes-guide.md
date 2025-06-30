# Snabbfixer för vanliga problem

## 🚨 Trial-bannern försvinner inte efter betalning

### Kontrollera betalningsstatus:
```bash
curl -s "https://www.handbok.org/api/handbook/HANDBOOK-ID/trial-status?userId=USER-ID" | jq .
```

### Om handboken fortfarande visar "isInTrial": true:

#### Alternativ 1: Manuell webhook-trigger
```bash
curl -X POST https://www.handbok.org/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handbookId": "HANDBOOK-ID",
    "userId": "USER-ID",
    "planType": "monthly"
  }'
```

#### Alternativ 2: Tvinga siduppdatering
1. Gå till handboken i webbläsaren
2. Tryck `Ctrl+Shift+R` (Windows) eller `Cmd+Shift+R` (Mac) för att force refresh
3. Eller öppna i incognito/privat läge

#### Alternativ 3: Rensa browser cache
1. Öppna Developer Tools (F12)
2. Högerklicka på refresh-knappen
3. Välj "Empty Cache and Hard Reload"

#### Alternativ 4: Admin-fix (för admins)
1. Gå till `/admin/customers`
2. Hitta användaren
3. Klicka "Run Lifecycle Check"

### Om betalningen gick igenom men handboken inte uppdaterades:

#### Kontrollera Stripe Dashboard:
1. Gå till [Stripe Dashboard](https://dashboard.stripe.com/payments)
2. Hitta betalningen (borde visa som "succeeded")
3. Kolla webhook-loggar under "Developers" → "Webhooks"

#### Manuell databasfix (för utvecklare):
```sql
-- Uppdatera handboken till betald status
UPDATE handbooks 
SET trial_end_date = NULL, 
    created_during_trial = false 
WHERE id = 'HANDBOOK-ID';

-- Skapa/uppdatera subscription
INSERT INTO subscriptions (user_id, handbook_id, plan_type, status, started_at)
VALUES ('USER-ID', 'HANDBOOK-ID', 'monthly', 'active', NOW())
ON CONFLICT (user_id, handbook_id) DO UPDATE SET
  status = 'active',
  plan_type = 'monthly',
  updated_at = NOW();
```

## 🚨 Success-sidan för komplex

### Kortare success-sida
Success-sidan är nu förenklad till bara:
- Bekräftelse att betalning gick igenom
- Knapp för att fortsätta
- Ingen onödigi informationslista

## 🚨 Produktionstestning 

### Säkra metoder:
1. **Minimal kostnad (3 kr):**
   - Ändra `HANDBOOK_PRICE` till `300` i Vercel
   - Testa med riktigt kort
   - Återställ till `149000` efter test

2. **Test-endpoints (gratis):**
   ```bash
   curl -X POST https://www.handbok.org/api/test-webhook \
     -H "Content-Type: application/json" \
     -d '{"handbookId":"test-id","userId":"test-user","planType":"monthly"}'
   ```

3. **Stripe testkort (utveckling):**
   - Kortnummer: `4242 4242 4242 4242`
   - Utgångsdatum: `12/25`
   - CVC: `123`

## 🚨 Webhook-fel

### Vanliga problem:
1. **Constraint violation:** Nu fixat i koden
2. **Timeout:** Webhooks har 30s timeout
3. **Duplicate events:** Stripe kan skicka samma event flera gånger

### Debug-endpoints:
```bash
# Kontrollera miljöstatus
curl https://www.handbok.org/api/debug/env-check | jq .

# Testa webhook-funktionalitet
curl -X POST https://www.handbok.org/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"handbookId":"test","userId":"test","planType":"monthly"}'
```

## 🚨 Prestanda

### Cache-problem:
- Browser cache: Hard refresh (`Ctrl+Shift+R`)
- CDN cache: Vänta 5-10 minuter
- Server cache: Deploya ny version

### Slow loading:
- Kontrollera Vercel Functions logs
- Kolla Supabase connection pooling
- Optimera API-anrop 