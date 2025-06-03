# Implementationsguide: 30 Dagars Trial-System

## Snabbstart

Denna guide visar hur du implementerar och konfigurerar 30 dagars trial-systemet för nya användare.

## Steg 1: Databasmigration

### 1.1 Kör migrationen

```bash
# Navigera till Supabase-mappen
cd supabase

# Kör migrationen för trial-systemet
supabase db push
```

Eller manuellt via Supabase Dashboard:

1. Gå till SQL Editor i Supabase Dashboard
2. Kör innehållet från `supabase/migrations/add_trial_system.sql`

### 1.2 Verifiera tabeller

Kontrollera att följande tabeller skapats:

```sql
-- Kontrollera att tabellerna finns
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'trial_activities');

-- Kontrollera att handbooks-tabellen uppdaterats
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'handbooks' 
AND column_name IN ('is_trial_handbook', 'created_during_trial');
```

## Steg 2: Backend-konfiguration

### 2.1 Installera dependencies

Kontrollera att alla nödvändiga paket är installerade:

```bash
npm install @supabase/supabase-js
```

### 2.2 Miljövariabler

Lägg till i `.env.local`:

```env
# Trial-konfiguration
TRIAL_DURATION_DAYS=30

# Supabase (redan konfigurerat)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.3 Verifiera API-endpoints

Testa att API-endpoints fungerar:

```bash
# Starta utvecklingsservern
npm run dev

# Testa trial-status endpoint (kräver autentiserad användare)
curl -X POST http://localhost:3000/api/trial/check-status \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

## Steg 3: Frontend-integration

### 3.1 Uppdatera create-handbook sidan

Kontrollera att `CreateHandbookForm` komponenten är uppdaterad:

```typescript
// src/app/create-handbook/components/CreateHandbookForm.tsx
import { getTrialStatus, isEligibleForTrial } from '@/lib/trial-service';

// Komponenten ska automatiskt visa trial-erbjudande för berättigade användare
```

### 3.2 Lägg till trial-status i dashboard

Kontrollera att `TrialStatusCard` visas i dashboard:

```typescript
// src/app/dashboard/page.tsx
import { TrialStatusCard } from '@/components/trial/TrialStatusCard';

// Komponenten ska visas för alla icke-superadmin användare
{user && !isSuperadmin && (
  <TrialStatusCard userId={user.id} className="mb-8" />
)}
```

## Steg 4: Testning

### 4.1 Enhetstester

```bash
# Kör trial-service tester
npm test trial-service.test.ts

# Kör alla tester
npm test
```

### 4.2 Manuell testning

#### Test 1: Ny användare skapar första handbok

1. Skapa nytt användarkonto via `/signup`
2. Gå till `/create-handbook`
3. Verifiera att trial-erbjudande visas
4. Skapa handbok med trial
5. Kontrollera att trial-status visas i dashboard

#### Test 2: Användare som redan använt trial

1. Logga in som användare med befintlig trial
2. Försök skapa ny handbok
3. Verifiera att betalning krävs istället för trial

#### Test 3: Trial-status i dashboard

1. Logga in som användare med aktiv trial
2. Gå till `/dashboard`
3. Verifiera att `TrialStatusCard` visas korrekt
4. Kontrollera dagar kvar och slutdatum

### 4.3 Databastester

```sql
-- Testa trial-funktioner direkt i databasen
SELECT start_user_trial('test-user-id', 'test@example.com');
SELECT * FROM check_trial_status('test-user-id');

-- Kontrollera trial-aktiviteter
SELECT * FROM trial_activities WHERE user_id = 'test-user-id';
```

## Steg 5: Produktionsdeploy

### 5.1 Miljövariabler i produktion

Sätt följande i Vercel/produktionsmiljö:

```env
TRIAL_DURATION_DAYS=30
NEXT_PUBLIC_SUPABASE_URL=your_prod_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key
```

### 5.2 Databasmigration i produktion

```bash
# Anslut till produktionsdatabas
supabase link --project-ref your-project-ref

# Kör migration
supabase db push
```

### 5.3 Verifiera deployment

1. Testa trial-flödet med riktiga användare
2. Kontrollera att emails skickas korrekt
3. Verifiera att Stripe-integration fungerar för uppgraderingar

## Steg 6: Övervakning och underhåll

### 6.1 Övervaka trial-aktivitet

```sql
-- Daglig rapport över trial-aktivitet
SELECT 
  DATE(created_at) as date,
  activity_type,
  COUNT(*) as count
FROM trial_activities 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), activity_type
ORDER BY date DESC;
```

### 6.2 Identifiera trials som snart går ut

```sql
-- Användare vars trial går ut inom 3 dagar
SELECT 
  up.id,
  up.email,
  up.trial_ends_at,
  EXTRACT(days FROM (up.trial_ends_at - NOW())) as days_remaining
FROM user_profiles up
WHERE up.trial_ends_at IS NOT NULL
  AND up.trial_ends_at > NOW()
  AND up.trial_ends_at <= NOW() + INTERVAL '3 days'
  AND up.subscription_status = 'trial';
```

### 6.3 Konverteringsstatistik

```sql
-- Trial-konverteringsstatistik
SELECT 
  COUNT(CASE WHEN subscription_status = 'trial' THEN 1 END) as active_trials,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as converted,
  COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired,
  ROUND(
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN trial_used = true THEN 1 END), 0), 
    2
  ) as conversion_rate_percent
FROM user_profiles
WHERE trial_used = true;
```

## Felsökning

### Problem: Trial startar inte

**Symptom:** Användare ser betalningsalternativ istället för trial

**Lösning:**
1. Kontrollera `isEligibleForTrial()` logik
2. Verifiera att användaren inte redan har en profil
3. Kolla RLS policies i Supabase

```sql
-- Debug: Kontrollera användarprofil
SELECT * FROM user_profiles WHERE id = 'user-id';

-- Debug: Kontrollera handböcker
SELECT * FROM handbooks WHERE owner_id = 'user-id';
```

### Problem: Felaktig trial-status

**Symptom:** Dashboard visar fel antal dagar kvar

**Lösning:**
1. Kontrollera tidszoner i databas vs frontend
2. Verifiera `check_trial_status()` funktion
3. Kontrollera att `trial_ends_at` är korrekt satt

```sql
-- Debug: Kontrollera trial-status direkt
SELECT 
  trial_ends_at,
  NOW() as current_time,
  trial_ends_at - NOW() as time_remaining,
  EXTRACT(days FROM (trial_ends_at - NOW())) as days_remaining
FROM user_profiles 
WHERE id = 'user-id';
```

### Problem: API-fel

**Symptom:** 500-fel från trial-endpoints

**Lösning:**
1. Kontrollera Supabase-anslutning
2. Verifiera service role key
3. Kolla server-loggar

```bash
# Kontrollera Next.js loggar
npm run dev

# Kontrollera Supabase loggar
supabase logs
```

## Anpassningar

### Ändra trial-längd

```sql
-- Uppdatera trial-längd i start_user_trial() funktionen
CREATE OR REPLACE FUNCTION start_user_trial(user_id UUID, user_email TEXT DEFAULT NULL)
RETURNS user_profiles AS $$
DECLARE
  trial_duration INTERVAL := '14 days'; -- Ändra från 30 till 14 dagar
  -- ... resten av funktionen
```

### Lägg till email-påminnelser

1. Skapa Supabase Edge Function för email
2. Schemalägg med pg_cron
3. Integrera med email-service (SendGrid, etc.)

### Anpassa trial-funktioner

Modifiera `TrialStatusCard` för att visa olika funktioner:

```typescript
// Anpassa vad som visas i trial-erbjudandet
const trialFeatures = [
  'Full tillgång till alla funktioner',
  'Obegränsad redigering',
  'Medlemshantering',
  'Publicering på webben'
];
```

## Support

För frågor eller problem:

1. Kontrollera denna dokumentation
2. Kolla `trial-system.md` för detaljerad teknisk information
3. Granska testfiler för exempel på användning
4. Kontakta utvecklingsteamet för support 