# Webhook Setup för nya användarregistreringar

## Översikt
Detta system låter dig få notifikationer när nya kunder registrerar sig på din plattform.

## 🔧 Installation och konfiguration

### 1. Miljövariabler (.env.local)
Lägg till dessa variabler i din `.env.local` fil:

```bash
# Resend API för e-postnotifikationer
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Din admin e-post för notifikationer
ADMIN_EMAIL=din@email.com

# Webhook säkerhet
SUPABASE_WEBHOOK_SECRET=din-hemliga-webhook-nyckel

# Site URL för länkar i e-post
NEXT_PUBLIC_SITE_URL=https://din-domän.com
```

### 2. Installera Resend-paketet
```bash
npm install resend
```

### 3. Konfigurera Supabase Database Webhooks

#### Steg 1: Gå till Supabase Dashboard
1. Öppna ditt Supabase-projekt
2. Gå till "Database" → "Webhooks"
3. Klicka "Create a new webhook"

#### Steg 2: Webhook-inställningar
```
Name: New User Registration
Table: auth.users
Events: INSERT
Type: HTTP Request
HTTP Method: POST
URL: https://din-domän.com/api/webhook/new-user
HTTP Headers:
  Content-Type: application/json
  Authorization: Bearer din-hemliga-webhook-nyckel
```

#### Steg 3: Webhook Payload (valfritt)
Du kan lämna payload-fältet tomt eller använda:
```json
{
  "type": "INSERT",
  "table": "users",
  "record": {
    "id": "{{ record.id }}",
    "email": "{{ record.email }}",
    "created_at": "{{ record.created_at }}"
  }
}
```

### 4. Testa webhook-systemet

#### Test lokalt med ngrok
```bash
# Installera ngrok om du inte har det
npm install -g ngrok

# Starta din Next.js app
npm run dev

# I en annan terminal, starta ngrok
ngrok http 3000

# Använd ngrok URL för webhook-konfiguration
# Exempel: https://abc123.ngrok.io/api/webhook/new-user
```

#### Test i produktion
1. Skapa en testanvändare via signup-sidan
2. Kontrollera att du får e-postnotifikation
3. Verifiera att aktiviteten visas i admin dashboarden

## 📧 E-postnotifikationer

### Funktioner som inkluderas:
- **Automatisk notifikation** när ny användare registrerar sig
- **Användardetaljer** (e-post, tidpunkt, användar-ID)
- **Direktlänk** till admin dashboard
- **Vacker HTML-formatering** för bättre läsbarhet

### Anpassa e-postmallen
Redigera filen `src/app/api/webhook/new-user/route.ts` för att ändra:
- E-postlayout och design
- Vilken information som inkluderas
- Mottagarlista (kan lägga till flera admins)

## 📊 Admin Dashboard Förbättringar

### Nya funktioner:
- **Detaljerad användarstatistik** med tidsfiltrering
- **Senaste aktiviteter** timeline
- **Nya användare idag/vecka/månad**
- **Real-time uppdateringar** av statistik

### Tillgång till dashboard:
```
URL: https://din-domän.com/admin
Krav: Superadmin-behörighet i databasen
```

## 🛠 Felsökning

### Webhook fungerar inte
1. **Kontrollera URL**: Se till att webhook-URL:en är korrekt
2. **Verifiera headers**: Authorization header måste matcha SUPABASE_WEBHOOK_SECRET
3. **Kolla logs**: Öppna Vercel/hosting logs för att se fel

### E-post skickas inte
1. **Resend API-nyckel**: Kontrollera att RESEND_API_KEY är korrekt
2. **Admin e-post**: Se till att ADMIN_EMAIL är inställd
3. **Från-adress**: Verifiera att noreply@handbok.org är verifierad i Resend

### Dashboard visar fel data
1. **Superadmin-status**: Kontrollera att din användare har is_superadmin=true
2. **Databasrättigheter**: Verifiera service role access till auth.users

## 🔒 Säkerhet

### Webhook-säkerhet
- Använd stark, slumpmässig SUPABASE_WEBHOOK_SECRET
- Webhook endpoint validerar alltid Authorization header
- Loggar all webhook-aktivitet för säkerhetsövervakning

### API-säkerhet
- Admin API-routes kräver superadmin-verifiering
- Alla känsliga operationer loggas
- Rate limiting på webhook endpoint (rekommenderas)

## 📈 Utökningar

### Fler notifikationskanaler
Du kan lägga till:
- **Slack-notifikationer**
- **Discord webhooks**
- **SMS via Twilio**
- **Push-notifikationer**

### Avancerad statistik
Framtida förbättringar:
- **Grafisk representation** av användarstatistik
- **Cohort-analys** för användarretention
- **A/B-test tracking** för registreringskonvertering
- **Geografisk fördelning** av användare

## 🚀 Nästa steg

1. **Sätt upp webhook** enligt instruktionerna ovan
2. **Testa systemet** med en testregistrering
3. **Anpassa e-postmallen** efter dina behov
4. **Utforska admin dashboarden** för statistik och användarhantering

Du kommer nu få notifikationer direkt i din inkorg varje gång en ny kund registrerar sig! 🎉 