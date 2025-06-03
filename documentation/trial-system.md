# 30 Dagars Trial-System

## Översikt

Trial-systemet ger nya användare möjlighet att prova tjänsten gratis i 30 dagar när de skapar sin första handbok. Detta implementeras genom en kombination av databasschema, backend-logik och frontend-komponenter.

## Funktioner

- **30 dagars gratis trial** för nya användare
- **Automatisk aktivering** när första handboken skapas
- **Trial-status tracking** med dagar kvar
- **Smidig övergång** till betald prenumeration
- **Flexibel hantering** av trial-perioder

## Databasschema

### user_profiles

Huvudtabell för att spåra användarprofiler och trial-status:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT,
  full_name TEXT,
  -- Trial-relaterade fält
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  trial_used BOOLEAN DEFAULT FALSE,
  -- Prenumerationsstatus
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'canceled', 'expired')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE,
  -- Metadata
  first_handbook_created_at TIMESTAMP WITH TIME ZONE,
  total_handbooks_created INTEGER DEFAULT 0
);
```

### trial_activities

Aktivitetslogg för trial-relaterade händelser:

```sql
CREATE TABLE trial_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('trial_started', 'trial_extended', 'trial_ended', 'trial_converted')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB
);
```

### handbooks (utökad)

Nya kolumner för att spåra trial-handböcker:

```sql
ALTER TABLE handbooks ADD COLUMN is_trial_handbook BOOLEAN DEFAULT FALSE;
ALTER TABLE handbooks ADD COLUMN created_during_trial BOOLEAN DEFAULT FALSE;
```

## Databasfunktioner

### start_user_trial()

Startar en 30 dagars trial för en användare:

```sql
SELECT start_user_trial('user-id', 'user@example.com');
```

### check_trial_status()

Kontrollerar trial-status för en användare:

```sql
SELECT * FROM check_trial_status('user-id');
```

Returnerar:
- `is_in_trial`: Boolean om användaren är i aktiv trial
- `trial_days_remaining`: Antal dagar kvar
- `subscription_status`: Aktuell prenumerationsstatus
- `trial_ends_at`: När trial slutar

## API Endpoints

### GET/POST /api/trial/check-status

Kontrollerar trial-status för en användare.

**Request:**
```json
{
  "userId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "trialStatus": {
    "isInTrial": true,
    "trialDaysRemaining": 25,
    "subscriptionStatus": "trial",
    "trialEndsAt": "2024-02-01T12:00:00Z",
    "canCreateHandbook": true,
    "hasUsedTrial": true
  }
}
```

### POST /api/trial/start

Startar en trial och skapar första handboken.

**Request:**
```json
{
  "handbookData": {
    "name": "Brf Solgläntan",
    "subdomain": "solglantan",
    "template": { ... },
    "userId": "user-id"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "30 dagars gratis trial startad! Din handbok har skapats.",
  "handbookId": "handbook-id",
  "subdomain": "solglantan",
  "trialEndsAt": "2024-02-01T12:00:00Z",
  "redirectUrl": "/solglantan"
}
```

## Frontend-komponenter

### CreateHandbookForm

Uppdaterad för att hantera trial-logik:

```typescript
// Kontrollera trial-berättigande
const [isEligibleForTrialState, setIsEligibleForTrialState] = useState<boolean>(false);

// Visa trial-erbjudande eller betalning
{isEligibleForTrialState ? (
  <TrialOfferCard />
) : (
  <PaymentCard />
)}
```

### TrialStatusCard

Visar trial-status i dashboard:

```typescript
<TrialStatusCard userId={user.id} className="mb-8" />
```

Komponenten visar:
- **Aktiv trial**: Dagar kvar, funktioner, uppgraderingsknapp
- **Utgången trial**: Uppmaningar att uppgradera
- **Aktiv prenumeration**: Bekräftelse och hanteringsalternativ

## Service-funktioner

### trial-service.ts

Huvudfunktioner för trial-hantering:

```typescript
// Kontrollera trial-status
const status = await getTrialStatus(userId);

// Starta trial
const profile = await startUserTrial(userId, userEmail);

// Kontrollera berättigande
const eligible = await isEligibleForTrial(userId);

// Hjälpfunktioner
const formatted = formatTrialEndDate(trialEndsAt);
const expired = isTrialExpired(trialEndsAt);
const daysLeft = getTrialDaysRemaining(trialEndsAt);
```

## Användningsflöde

### 1. Ny användare registrerar sig
- Användaren skapar konto via `/signup`
- Ingen trial startas ännu

### 2. Första handbok skapas
- Användaren går till `/create-handbook`
- Systemet kontrollerar `isEligibleForTrial()`
- Om berättigad: Visa trial-erbjudande
- Om inte: Visa betalningsalternativ

### 3. Trial startas
- Användaren klickar "Starta 30 dagars gratis trial"
- API-anrop till `/api/trial/start`
- Trial-profil skapas i databasen
- Handbok skapas med `is_trial_handbook: true`
- Användaren omdirigeras till handboken

### 4. Trial-period
- Användaren ser trial-status i dashboard
- Påminnelser visas när trial närmar sig slutet
- Full funktionalitet tillgänglig

### 5. Trial slutar
- Automatiska påminnelser om uppgradering
- Begränsad funktionalitet efter utgång
- Enkla uppgraderingsalternativ

## Konfiguration

### Miljövariabler

```env
# Trial-längd (kan anpassas)
TRIAL_DURATION_DAYS=30

# Stripe-konfiguration för uppgraderingar
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Anpassning

Trial-längden kan ändras i databasfunktionen:

```sql
-- I start_user_trial() funktionen
DECLARE
  trial_duration INTERVAL := '30 days'; -- Ändra här
```

## Säkerhet

### RLS Policies

Alla trial-tabeller har Row Level Security aktiverat:

```sql
-- Användare kan bara se sin egen data
CREATE POLICY "Användare kan se sin egen profil" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);
```

### Validering

- Trial kan bara startas en gång per användare
- Kontroller för att förhindra missbruk
- Säker hantering av användardata

## Testning

### Enhetstester

```bash
npm test trial-service.test.ts
```

Testar:
- Trial-status kontroller
- Berättigande-logik
- Datum-hantering
- Felhantering

### Integrationstester

```bash
npm test api/trial
```

Testar:
- API-endpoints
- Databasinteraktioner
- Autentisering

## Felsökning

### Vanliga problem

1. **Trial startar inte**
   - Kontrollera att användaren är berättigad
   - Verifiera databasanslutning
   - Kolla RLS policies

2. **Felaktig trial-status**
   - Kontrollera `check_trial_status()` funktion
   - Verifiera tidszoner
   - Kolla databasdata

3. **UI visar fel information**
   - Kontrollera `TrialStatusCard` props
   - Verifiera API-svar
   - Kolla frontend-state

### Loggning

Trial-aktiviteter loggas i `trial_activities` tabellen:

```sql
SELECT * FROM trial_activities 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC;
```

## Framtida förbättringar

- **Email-påminnelser** när trial närmar sig slutet
- **A/B-testning** av trial-längder
- **Avancerad analytics** för trial-konvertering
- **Flexibla trial-typer** (funktionsbegränsade vs tidsbegränsade)
- **Trial-förlängningar** för specifika användare 