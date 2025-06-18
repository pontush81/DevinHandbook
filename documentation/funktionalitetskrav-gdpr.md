# Funktionalitetskrav för GDPR-compliance

**Datum:** 2024-12-27  
**Status:** 🔄 Kräver utveckling

## 📋 Översikt

Baserat på våra juridiska texter och GDPR-åtaganden behöver följande funktioner utvecklas:

## 🚨 Kritiska funktioner som måste implementeras

### 1. **Automatisk dataradering efter 90 dagar** ⚠️ HÖGSTA PRIORITET

**Vad vi lovat:**
> "Efter kontouppsägning bevaras data i 90 dagar, därefter raderas all information permanent"

**Vad som behövs:**
```sql
-- Ny tabell för att spåra kontouppsägningar
CREATE TABLE account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  handbook_id UUID REFERENCES handbooks(id),
  deletion_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Implementering:**
- **Cron job** som körs dagligen och raderar data där `scheduled_deletion_at < NOW()`
- **Användarvarningar** på dag 75, 85, 89 innan radering
- **Administrativ ångerfunktion** (inom 90 dagar)

### 2. **GDPR-dataexport** ⚠️ HÖGSTA PRIORITET

**Vad vi lovat:**
> "Rätt till dataportabilitet - du kan begära en kopia av dina personuppgifter"

**Vad som behövs:**
```typescript
// API endpoint: /api/gdpr/export
export async function POST(request: Request) {
  // 1. Autentisera användaren
  // 2. Samla ALL användardata från alla tabeller
  // 3. Generera JSON/CSV-fil
  // 4. Skicka säker nedladdningslänk via e-post
  // 5. Logga exporten för revision
}
```

**Data som ska exporteras:**
- Användaruppgifter (namn, e-post, telefon)
- Handböcker och innehåll
- Kommentarer och aktivitetsloggar
- Notifikationsinställningar
- Betalningshistorik (utan känsliga kortuppgifter)

### 3. **GDPR-radering ("Rätten att bli glömd")** ⚠️ HÖGSTA PRIORITET

**Vad vi lovat:**
> "Du har rätt att begära radering av dina personuppgifter"

**Implementering:**
```typescript
// API endpoint: /api/gdpr/delete
export async function POST(request: Request) {
  // 1. Autentisera användaren
  // 2. Varning om permanent radering
  // 3. Anonymisera data istället för hård radering (för integritet)
  // 4. Behåll endast nödvändig data för bokföring/juridik
  // 5. Skicka bekräftelse via e-post
}
```

### 4. **Säkerhetsincidenthantering** ⚠️ HÖG PRIORITET

**Vad vi lovat:**
> "Vi kommer att meddela dig om säkerhetsincidenter inom 72 timmar"

**Vad som behövs:**
- **Incidentloggning** - Automatisk detektion av ovanliga aktiviteter
- **Notifikationssystem** - E-post till berörda användare
- **Admin-dashboard** - Översikt över säkerhetsincidenter
- **Rapportering** - Automatisk rapportering till tillsynsmyndighet

## 🔧 Viktiga funktioner som bör implementeras

### 5. **Samtyckehantering** 📋 MEDEL PRIORITET

**Vad som behövs:**
```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  consent_type TEXT NOT NULL, -- 'marketing', 'analytics', 'cookies'
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT
);
```

### 6. **Aktivitetsloggning för revision** 📋 MEDEL PRIORITET

**Vad som behövs:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'login', 'data_export', 'data_deletion', etc.
  resource_type TEXT, -- 'handbook', 'user', 'payment'
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. **Dataportabilitet för handböcker** 📋 MEDEL PRIORITET

**Vad som behövs:**
- Export av handböcker som PDF
- Export av handböcker som JSON/XML
- Bulk-export för hela organisationer

## ⚡ Akut implementation krävs

### Inom 1 vecka:
1. **Grundläggande GDPR-export** - Enkel JSON-export av användardata
2. **Grundläggande GDPR-radering** - Anonymisering av användardata
3. **90-dagars raderingsschema** - Cron job för automatisk radering

### Inom 1 månad:
4. **Säkerhetsincidenthantering** - Grundläggande monitoring
5. **Samtyckehantering** - Cookie-samtycken och marknadsföring
6. **Aktivitetsloggning** - Grundläggande audit trail

## 💻 Teknisk implementering

### Databas-migrationer som behövs:

```sql
-- 1. Kontouppsägningar och schemalagd radering
CREATE TABLE account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  handbook_id UUID REFERENCES handbooks(id),
  deletion_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GDPR-förfrågningar
CREATE TABLE gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'rectification')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  data_exported_url TEXT, -- För export-förfrågningar
  notes TEXT
);

-- 3. Samtycken
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT
);

-- 4. Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Säkerhetsincidenter
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  affected_users UUID[],
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  reported_to_authority BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed'))
);
```

### API-endpoints som behövs:

```typescript
// GDPR-endpoints
POST /api/gdpr/export-request    // Begär dataexport
GET  /api/gdpr/export/:id        // Ladda ner exporterad data
POST /api/gdpr/delete-request    // Begär radering
POST /api/gdpr/rectify-request   // Begär rättelse

// Admin-endpoints
GET  /api/admin/gdpr-requests    // Lista alla GDPR-förfrågningar
POST /api/admin/process-deletion // Behandla raderingsbegäran
GET  /api/admin/security-incidents // Lista säkerhetsincidenter

// Automatiska processer
POST /api/cron/cleanup-expired-data  // Daglig cleanup
POST /api/cron/send-deletion-warnings // Varningar innan radering
```

## 🎯 Prioriterad utvecklingsplan

### Sprint 1 (1 vecka) - KRITISKT:
- [ ] Databas-migrationer för GDPR-tabeller
- [ ] Grundläggande GDPR-export (JSON)
- [ ] Grundläggande GDPR-radering (anonymisering)
- [ ] 90-dagars raderingsschema (cron job)

### Sprint 2 (2 veckor) - HÖGT:
- [ ] Säkerhetsincidenthantering
- [ ] Förbättrad GDPR-export (PDF, strukturerad data)
- [ ] Användarvarningar innan radering
- [ ] Admin-dashboard för GDPR-förfrågningar

### Sprint 3 (3 veckor) - MEDEL:
- [ ] Samtyckehantering
- [ ] Aktivitetsloggning
- [ ] Dataportabilitet för handböcker
- [ ] Automatisk säkerhetsmonitoring

## ⚠️ Juridiska risker utan implementation

**Utan dessa funktioner riskerar du:**
- **GDPR-böter** upp till 4% av årsomsättningen
- **Förlust av användartillit** 
- **Juridiska tvister** från användare
- **Tillsynsmyndighetsingripanden**

## 🚀 Rekommendation

**Starta omedelbart med Sprint 1** - dessa funktioner är juridiskt nödvändiga och måste finnas på plats innan lansering.

Vill du att jag hjälper dig implementera någon av dessa funktioner? 