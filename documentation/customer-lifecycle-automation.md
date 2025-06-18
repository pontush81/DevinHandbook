# Customer Lifecycle Automation - Handbok.org

## Översikt

Denna dokumentation beskriver det automatiserade customer lifecycle management-systemet för Handbok.org. Systemet hanterar automatiskt kund on/offboarding, prenumerationshantering, och GDPR-compliance för hela kundlivscykeln.

## Systemarkitektur

### Databastabeller

#### 1. `subscriptions` - Prenumerationshantering
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- handbook_id: UUID (Foreign Key to handbooks)
- plan_type: TEXT (free, trial, basic, premium, enterprise)
- status: TEXT (active, cancelled, expired, suspended, pending_cancellation)
- started_at: TIMESTAMP
- expires_at: TIMESTAMP
- trial_ends_at: TIMESTAMP
- stripe_subscription_id: TEXT
- stripe_customer_id: TEXT
- last_payment_at: TIMESTAMP
- next_payment_due: TIMESTAMP
- auto_renewal: BOOLEAN
- cancellation_reason: TEXT
- metadata: JSONB
```

#### 2. `account_status` - Centraliserad kontostatus
```sql
- id: UUID (Primary Key)
- user_id: UUID (Unique, Foreign Key to auth.users)
- status: TEXT (active, trial, suspended, cancelled, pending_deletion, deleted)
- can_access_handbooks: BOOLEAN
- can_create_handbooks: BOOLEAN
- max_handbooks: INTEGER
- suspension_reason: TEXT
- suspended_at: TIMESTAMP
- scheduled_deletion_at: TIMESTAMP
- warning_sent_at: TIMESTAMP
- final_warning_sent_at: TIMESTAMP
- metadata: JSONB
```

#### 3. `customer_lifecycle_events` - Händelseloggning
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- handbook_id: UUID (Foreign Key to handbooks)
- subscription_id: UUID (Foreign Key to subscriptions)
- event_type: TEXT (trial_started, trial_ending_soon, subscription_cancelled, etc.)
- status: TEXT (pending, processing, completed, failed)
- automated_action: TEXT
- action_scheduled_for: TIMESTAMP
- action_completed_at: TIMESTAMP
- metadata: JSONB
- error_message: TEXT
```

#### 4. `automated_actions_queue` - Automatiska åtgärder
```sql
- id: UUID (Primary Key)
- action_type: TEXT (send_trial_reminder, suspend_account, delete_user_data, etc.)
- target_user_id: UUID (Foreign Key to auth.users)
- target_handbook_id: UUID (Foreign Key to handbooks)
- scheduled_for: TIMESTAMP
- priority: INTEGER (1-10, 1 = högst prioritet)
- status: TEXT (pending, processing, completed, failed, cancelled)
- started_at: TIMESTAMP
- completed_at: TIMESTAMP
- attempts: INTEGER
- max_attempts: INTEGER
- success: BOOLEAN
- error_message: TEXT
- metadata: JSONB
```

### Automatiserade Processer

## 1. Trial Management

### Trial Start (Onboarding)
```sql
-- Automatisk trigger när ny trial skapas
INSERT INTO subscriptions (user_id, plan_type, status, trial_ends_at)
VALUES (user_id, 'trial', 'active', NOW() + INTERVAL '14 days');

-- Schemalägga påminnelser
INSERT INTO automated_actions_queue (action_type, target_user_id, scheduled_for, priority)
VALUES 
  ('send_trial_reminder', user_id, NOW() + INTERVAL '7 days', 5),
  ('send_trial_reminder', user_id, NOW() + INTERVAL '12 days', 3),
  ('send_trial_reminder', user_id, NOW() + INTERVAL '13 days', 2);
```

### Trial Expiration (Offboarding)
```sql
-- Automatisk hantering när trial går ut
UPDATE subscriptions 
SET status = 'expired' 
WHERE plan_type = 'trial' AND trial_ends_at < NOW() AND status = 'active';

-- Initiera offboarding
SELECT initiate_customer_offboarding(user_id, 'trial_expired');
```

## 2. Subscription Management

### Betalning Misslyckad
```sql
-- Schemalägga betalningspåminnelser
INSERT INTO automated_actions_queue (action_type, target_user_id, scheduled_for, priority)
VALUES 
  ('send_payment_reminder', user_id, NOW() + INTERVAL '1 day', 4),
  ('send_payment_reminder', user_id, NOW() + INTERVAL '3 days', 3),
  ('send_payment_reminder', user_id, NOW() + INTERVAL '7 days', 2);

-- Suspendera efter 7 dagar
INSERT INTO automated_actions_queue (action_type, target_user_id, scheduled_for, priority)
VALUES ('suspend_account', user_id, NOW() + INTERVAL '7 days', 1);
```

### Prenumeration Avslutad
```sql
-- Automatisk nedgradering till gratis
UPDATE subscriptions 
SET plan_type = 'free', status = 'active', expires_at = NULL 
WHERE user_id = user_id;

-- Eller initiera offboarding
SELECT initiate_customer_offboarding(user_id, 'subscription_cancelled');
```

## 3. Data Retention & GDPR

### 90-Dagars Dataradering
```sql
-- Automatisk schemaläggning av dataradering
INSERT INTO account_deletions (
  user_id, deletion_reason, scheduled_deletion_at, status
) VALUES (
  user_id, 'subscription_ended', NOW() + INTERVAL '90 days', 'pending'
);

-- Schemalägga varningar
INSERT INTO automated_actions_queue (action_type, target_user_id, scheduled_for, priority)
VALUES 
  ('send_trial_reminder', user_id, NOW() + INTERVAL '75 days', 3),
  ('send_trial_reminder', user_id, NOW() + INTERVAL '85 days', 2),
  ('send_trial_reminder', user_id, NOW() + INTERVAL '89 days', 1),
  ('delete_user_data', user_id, NOW() + INTERVAL '90 days', 1);
```

## API Endpoints

### `/api/cron/customer-lifecycle`
**Metod:** GET  
**Autentisering:** Bearer token (CRON_SECRET)  
**Beskrivning:** Huvudsaklig cron-job som körs dagligen för att hantera customer lifecycle

**Funktioner:**
- Kontrollerar prenumerationsstatus
- Uppdaterar kontostatus
- Processar automatiska åtgärder
- Renser gamla poster

### `/admin/customer-lifecycle`
**Metod:** GET (UI)  
**Autentisering:** Admin-rättigheter  
**Beskrivning:** Admin-dashboard för att övervaka och hantera customer lifecycle

**Funktioner:**
- Översikt över alla prenumerationer
- Hantera schemalagda raderingar
- Övervaka automatiska åtgärder
- Manuell körning av lifecycle-check

## Automatiska Åtgärder

### E-postpåminnelser
```typescript
// Trial-påminnelser
send_trial_reminder: Skickas 7, 12, 13 dagar efter trial start

// Betalningspåminnelser  
send_payment_reminder: Skickas 1, 3, 7 dagar efter misslyckad betalning

// Raderingspåminnelser
send_deletion_warning: Skickas 75, 85, 89 dagar innan radering
```

### Kontosuspension
```typescript
suspend_account: 
- Sätter can_access_handbooks = false
- Sätter can_create_handbooks = false
- Loggar suspension_reason
- Skickar e-postnotifikation
```

### Dataradering
```typescript
delete_user_data:
- Anonymiserar användardata
- Raderar personlig information
- Behåller aggregerad statistik
- Loggar raderingsprocess
```

## Konfiguration

### Miljövariabler
```env
# Cron-säkerhet
CRON_SECRET=your-secure-cron-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# E-post (Resend)
RESEND_API_KEY=your-resend-api-key

# Site URL
NEXT_PUBLIC_SITE_URL=https://handbok.org
```

### Cron-jobb Konfiguration
```bash
# Vercel Cron (vercel.json)
{
  "crons": [
    {
      "path": "/api/cron/customer-lifecycle",
      "schedule": "0 2 * * *"
    }
  ]
}

# Eller traditionell cron
0 2 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://handbok.org/api/cron/customer-lifecycle
```

## Vanliga Use Cases för SaaS

### 1. Trial Management
- **Onboarding:** Automatisk välkomstsekvens
- **Engagement:** Påminnelser och tips under trial
- **Conversion:** Uppgraderingsförslag innan trial slutar
- **Offboarding:** Graceful nedgradering eller radering

### 2. Subscription Lifecycle
- **Renewal:** Automatiska påminnelser innan förnyelse
- **Failed Payments:** Gradvis eskalering av påminnelser
- **Cancellation:** Exit-intervjuer och win-back-kampanjer
- **Downgrade:** Mjuk övergång till lägre plan

### 3. Data Governance
- **Retention:** Automatisk dataradering enligt policy
- **GDPR:** Användares rätt att bli glömd
- **Backup:** Säkerhetskopiering innan radering
- **Compliance:** Fullständig audit trail

### 4. Customer Success
- **Health Scoring:** Automatisk riskbedömning
- **Intervention:** Proaktiv outreach till riskgrupper
- **Upselling:** Identifiera expansion-möjligheter
- **Churn Prevention:** Tidiga varningssignaler

## Säkerhet & Compliance

### GDPR Compliance
- Automatisk dataradering efter 90 dagar
- Användarens rätt att begära radering
- Fullständig audit trail
- Säker dataexport

### Säkerhetsåtgärder
- Krypterade API-nycklar
- Begränsad åtkomst till känslig data
- Säker token-baserad autentisering
- Logging av alla administrativa åtgärder

## Monitoring & Alerting

### Metrics att övervaka
```typescript
// Prenumerationsmetrics
- Aktiva prenumerationer per plan
- Churn rate per månad
- Trial-to-paid conversion rate
- Genomsnittlig customer lifetime value

// Systemmetrics  
- Automatiska åtgärder per dag
- Misslyckade åtgärder
- E-post delivery rate
- API response times

// Compliance metrics
- Schemalagda raderingar
- GDPR-förfrågningar
- Dataexport-förfrågningar
- Säkerhetsincidenter
```

### Alerting Rules
```yaml
# Hög churn rate
- alert: HighChurnRate
  expr: churn_rate > 0.05
  for: 1h

# Misslyckade automatiska åtgärder
- alert: FailedAutomatedActions
  expr: failed_actions_count > 10
  for: 5m

# Överdrivet många raderingsförfrågningar
- alert: HighDeletionRequests
  expr: deletion_requests_per_hour > 50
  for: 1h
```

## Utveckling & Testning

### Lokala Tester
```bash
# Kör lifecycle check manuellt
curl -H "Authorization: Bearer dev-secret" http://localhost:3000/api/cron/customer-lifecycle

# Testa specifik funktion
npm run test:lifecycle

# Simulera olika scenarios
npm run simulate:trial-expiry
npm run simulate:payment-failure
```

### Staging Environment
- Använd testdata för alla scenarios
- Minska tidsintervall för snabbare testning
- Mocka externa tjänster (Stripe, e-post)
- Fullständig audit trail

## Framtida Förbättringar

### Planerade Features
1. **Predictive Analytics:** ML-modeller för churn prediction
2. **Personalization:** Anpassade meddelanden baserat på användarbeteende
3. **A/B Testing:** Optimering av e-postmallar och timing
4. **Integration:** Webhooks för externa CRM-system
5. **Self-Service:** Användargränssnitt för prenumerationshantering

### Skalbarhet
- Asynkron bearbetning för stora volymer
- Databas-sharding för global distribution
- Caching för förbättrad prestanda
- Load balancing för hög tillgänglighet

## Slutsats

Detta system ger Handbok.org:
- **Automatiserad kundhantering** från onboarding till offboarding
- **GDPR-compliance** utan manuellt arbete
- **Skalbar arkitektur** som växer med verksamheten
- **Fullständig kontroll** över kundlivscykeln
- **Kostnadsbesparing** genom automation
- **Förbättrad kundupplevelse** genom proaktiv kommunikation

Systemet är produktionsredo och kan hanterar tusentals kunder automatiskt med minimal manuell intervention. 