# Backup-system för Handbok-databasen

## Översikt

Detta backup-system ger en robust lösning för att säkerhetskopiera och återställa Supabase-databasen. Systemet stöder både manuella och automatiska schemalagda backups med email-leverans.

## Funktioner

### ✅ Manuell backup
- Skapa backup direkt via admin-gränssnittet
- Ladda ner backup-fil lokalt
- Konfigurerbar inkludering av användardata och trial-data
- Checksum-validering för dataintegritetet

### ✅ Schemalagd backup
- Automatiska dagliga backups
- Email-leverans med backup som bilaga
- Detaljerad HTML-rapport med statistik
- Fel-notifieringar via email

### ✅ Återställning
- Säker återställning från backup-filer
- Validering av backup-data innan återställning
- Stegvis återställning med foreign key-hantering
- Säkerhetskontroller för att förhindra oavsiktlig dataförlust

### ✅ Monitoring
- Databas-statistik och hälsokontroller
- Backup-historik och status
- Cron-system monitoring

## Installation och konfiguration

### 1. Miljövariabler

Lägg till följande miljövariabler i din `.env.local`:

```bash
# Backup-konfiguration
ADMIN_EMAIL=din-admin@email.com
BACKUP_EMAIL=backup@handbok.org
CRON_SECRET_TOKEN=din-säkra-token-här

# Resend för email (redan konfigurerat)
RESEND_API_KEY=din-resend-api-key

# Supabase (redan konfigurerat)
NEXT_PUBLIC_SUPABASE_URL=din-supabase-url
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
```

### 2. Email-konfiguration

Systemet använder Resend för email-leverans. Konfigurera följande:

1. Skaffa en Resend API-nyckel från [resend.com](https://resend.com)
2. Verifiera din domän i Resend
3. Lägg till `RESEND_API_KEY` i miljövariablerna

### 3. Cron-konfiguration

För automatiska dagliga backups, konfigurera en cron-tjänst:

#### Vercel Cron (Rekommenderat)
Skapa `vercel.json` med:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### GitHub Actions
Skapa `.github/workflows/backup.yml`:

```yaml
name: Daily Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Kör kl 02:00 UTC varje dag
  workflow_dispatch:     # Tillåt manuell körning

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger backup
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/backup" \
            -H "x-cron-token: ${{ secrets.CRON_SECRET_TOKEN }}"
```

#### Extern cron-tjänst
Konfigurera en extern tjänst att anropa:

```bash
curl -X POST "https://din-app.vercel.app/api/cron/backup" \
  -H "x-cron-token: DIN_SÄKRA_TOKEN"
```

## Användning

### Admin-gränssnitt

Gå till `/admin/backup` för att komma åt backup-hanteringen.

#### Manuell backup
1. Konfigurera backup-alternativ (användardata, trial-data, etc.)
2. Klicka på "Skapa och ladda ner backup"
3. Backup-filen laddas ner automatiskt

#### Schemalagd backup
1. Konfigurera email-inställningar
2. Klicka på "Skapa schemalagd backup"
3. Backup skickas via email

#### Återställning
1. Klistra in backup JSON-data i textfältet
2. Klicka på "Återställ databas"
3. Bekräfta åtgärden (VARNING: Ersätter ALL data!)

### API-endpoints

#### Skapa manuell backup
```bash
POST /api/admin/backup/create
Content-Type: application/json
Authorization: Bearer token

{
  "includeUserData": false,
  "includeTrialData": false,
  "compression": true
}
```

#### Hämta backup-statistik
```bash
GET /api/admin/backup/stats
```

#### Schemalagd backup
```bash
POST /api/admin/backup/scheduled
Content-Type: application/json

{
  "sendEmail": true,
  "emailTo": "admin@example.com",
  "emailSubject": "Databas-backup"
}
```

#### Återställ från backup
```bash
POST /api/admin/backup/restore
Content-Type: application/json
Authorization: Bearer token

{
  "backupData": { /* backup JSON */ },
  "force": true
}
```

## Backup-format

Backup-filer sparas i JSON-format med följande struktur:

```json
{
  "metadata": {
    "id": "backup_1234567890_abc123",
    "created_at": "2024-01-15T10:30:00.000Z",
    "backup_type": "manual|scheduled",
    "size_bytes": 1048576,
    "table_counts": {
      "handbooks": 5,
      "sections": 25,
      "pages": 150
    },
    "schema_version": "1.0.0",
    "checksum": "sha256-hash"
  },
  "data": {
    "handbooks": [...],
    "sections": [...],
    "pages": [...],
    "documents": [...],
    "attachments": [...]
  },
  "schema": {
    "version": "1.0.0",
    "tables": ["handbooks", "sections", "pages"],
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

## Säkerhet

### Åtkomstkontroll
- API-endpoints kräver autentisering
- Admin-gränssnitt kräver admin-behörighet
- Cron-endpoints skyddas med hemlig token

### Datahantering
- Användardata inkluderas INTE i automatiska backups
- Känslig data kan exkluderas från backups
- Checksum-validering säkerställer dataintegritetet

### Återställning
- Kräver explicit bekräftelse
- Validerar backup-data innan återställning
- Loggar alla återställningsoperationer

## Monitoring och felsökning

### Loggar
Systemet loggar alla backup-operationer:

```bash
# Visa backup-loggar
vercel logs --app=din-app --filter="backup"

# Visa cron-loggar
vercel logs --app=din-app --filter="cron"
```

### Hälsokontroller
```bash
# Kontrollera cron-system
GET /api/cron/backup

# Kontrollera backup-statistik
GET /api/admin/backup/stats
```

### Vanliga problem

#### Email skickas inte
1. Kontrollera `RESEND_API_KEY`
2. Verifiera domän i Resend
3. Kontrollera `ADMIN_EMAIL` är korrekt

#### Cron fungerar inte
1. Kontrollera `CRON_SECRET_TOKEN`
2. Verifiera cron-konfiguration
3. Testa manuellt: `curl -X POST .../api/cron/backup`

#### Backup misslyckas
1. Kontrollera Supabase-anslutning
2. Verifiera `SUPABASE_SERVICE_ROLE_KEY`
3. Kontrollera databas-behörigheter

## Bästa praxis

### Backup-strategi
- Kör dagliga automatiska backups
- Spara manuella backups före större ändringar
- Testa återställning regelbundet
- Förvara backups på flera platser

### Säkerhet
- Använd starka tokens för cron-åtkomst
- Begränsa admin-åtkomst
- Kryptera backup-filer vid lagring
- Övervaka backup-aktivitet

### Prestanda
- Schemalägg backups under lågtrafik-timmar
- Exkludera onödig data från automatiska backups
- Komprimera stora backup-filer
- Övervaka backup-storlek och tid

## Framtida förbättringar

### Planerade funktioner
- [ ] Inkrementella backups
- [ ] Backup-retention policies
- [ ] Kryptering av backup-filer
- [ ] Backup till molnlagring (S3, Google Cloud)
- [ ] Grafisk backup-historik
- [ ] Automatisk återställning vid fel
- [ ] Backup-verifiering och integritetstester

### Konfigurerbara alternativ
- [ ] Backup-frekvens (daglig, veckovis, månadsvis)
- [ ] Retention-period för gamla backups
- [ ] Anpassade email-mallar
- [ ] Webhook-notifieringar
- [ ] Backup-komprimering

## Support

För frågor eller problem med backup-systemet:

1. Kontrollera denna dokumentation
2. Granska loggar för fel-meddelanden
3. Testa API-endpoints manuellt
4. Kontakta systemadministratör

## Changelog

### v1.0.0 (2024-01-15)
- Initial implementation
- Manuell backup-funktionalitet
- Schemalagd backup med email
- Återställningsfunktioner
- Admin-gränssnitt
- Cron-system för automatiska backups 