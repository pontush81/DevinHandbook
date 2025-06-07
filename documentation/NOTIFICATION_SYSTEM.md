# Notifikationssystem för Forum

Detta dokument beskriver det kompletta notifikationssystemet för forum-funktionaliteten i digital handbok-applikationen.

## Översikt

Notifikationssystemet skickar automatiska e-postmeddelanden till användare när:
- Någon skapar ett nytt meddelande i forumet
- Någon svarar på ett meddelande användaren deltar i

Systemet använder **Resend** som e-posttjänst med optimerad batch-sending och respekterar användarnas notifikationsinställningar.

## Arkitektur

### Komponenter

1. **API Endpoints**
   - `/api/notifications/send` - Skickar notifikationer med batch-support
   - `/api/notifications/preferences` - Hanterar användarinställningar

2. **Databastabeller**
   - `forum_notifications` - Lagrar notifikationer
   - `user_notification_preferences` - Användarinställningar

3. **Frontend Komponenter**
   - `NotificationSettings` - UI för inställningar

### Flöde

```
1. Användare skapar meddelande/svar
   ↓
2. API-endpoint triggar notifikation
   ↓
3. System skapar in-app notifikationer först
   ↓
4. System filtrerar mottagare baserat på inställningar
   ↓
5. E-post skickas via Resend (single/batch beroende på antal)
   ↓
6. Notifikationsstatus uppdateras i databas
```

## Setup och Konfiguration

### 1. Miljövariabler

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_DOMAIN=yourdomain.com
SUPABASE_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_SITE_URL=https://yourapp.vercel.app
NEXT_PUBLIC_DOMAIN=yourapp.vercel.app
```

### 2. Resend Setup

1. Skapa konto på [resend.com](https://resend.com)
2. Verifiera din domän
3. Skapa API-nyckel
4. Lägg till API-nyckeln i miljövariablerna

### 3. Database Migration

Kör migration för att skapa notifikationstabeller:

```sql
-- Inkluderad i: supabase/migrations/add_notification_triggers.sql
```

## API Dokumentation

### POST /api/notifications/send

Skickar notifikationer för forum-aktivitet med optimerad batch-sending.

**Headers:**
```
Authorization: Bearer {SUPABASE_WEBHOOK_SECRET}
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "new_topic" | "new_reply",
  "handbook_id": "uuid",
  "topic_id": "uuid", 
  "post_id": "uuid", // För svar
  "author_name": "string",
  "content_preview": "string",
  "title": "string" // För nya meddelanden
}
```

**Response:**
```json
{
  "success": true,
  "sent": 5,
  "skipped": 2,
  "failed": 0,
  "total": 7
}
```

**Förbättringar:**
- ✅ **Batch Sending**: Automatisk användning av `resend.batch.send()` för 2+ mottagare
- ✅ **Smart E-posthantering**: Single send för 1 mottagare, batch för flera
- ✅ **Förbättrad Felsökerning**: Bättre loggning och tracking med tags
- ✅ **Reply-To Support**: Konfigurerad reply-to adress
- ✅ **E-post Tags**: Automatisk taggning för spårning

### GET /api/notifications/preferences

Hämtar användarens notifikationsinställningar.

**Query Parameters:**
- `handbook_id` (required)

**Response:**
```json
{
  "preferences": {
    "id": "uuid",
    "email_new_topics": true,
    "email_new_replies": true,
    "email_mentions": true,
    "app_new_topics": true,
    "app_new_replies": true,
    "app_mentions": true
  }
}
```

### PUT /api/notifications/preferences

Uppdaterar användarens notifikationsinställningar.

**Request Body:**
```json
{
  "handbook_id": "uuid",
  "email_new_topics": boolean,
  "email_new_replies": boolean,
  "email_mentions": boolean,
  "app_new_topics": boolean,
  "app_new_replies": boolean,
  "app_mentions": boolean
}
```

## Resend Integration - Förbättringar

### Batch E-postskickning

Systemet använder nu optimerad e-postskickning:

```javascript
// För 1 mottagare - single send
await resend.emails.send({
  from: fromEmail,
  to: recipient.email,
  subject: subject,
  html: emailContent,
  reply_to: replyToEmail,
  tags: [
    { name: 'type', value: type },
    { name: 'handbook', value: handbook_id },
    { name: 'topic', value: topic_id }
  ]
});

// För 2+ mottagare - batch send (upp till 100)
await resend.batch.send([
  {
    from: fromEmail,
    to: 'user1@example.com',
    subject: subject,
    html: emailContent,
    reply_to: replyToEmail,
    tags: [...]
  },
  // ... fler e-post
]);
```

### E-post Tags för Spårning

Varje e-post taggas automatiskt:
- `type`: 'new_topic' eller 'new_reply'
- `handbook`: handbook ID
- `topic`: topic ID

### Förbättrad Felhantering

- Chunking för stora batch-sends (>100 mottagare)
- Graceful fallback vid fel
- Detaljerad loggning av resultat
- Ingen blocking av huvudoperationen

## Frontend Implementation

### NotificationSettings Komponent

```tsx
import NotificationSettings from '@/components/NotificationSettings';

<NotificationSettings 
  handbookId="handbook-uuid"
  handbookName="BRF Segerstaden"
/>
```

### Integration i Meddelanden

```tsx
// I meddelanden-sidan
const [showNotificationSettings, setShowNotificationSettings] = useState(false);

<Button onClick={() => setShowNotificationSettings(true)}>
  <Settings className="h-4 w-4 mr-2" />
  Notifikationer
</Button>
```

## E-postmallar

### Nytt Meddelande (Blå tema)

```html
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
  <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Nytt meddelande</h1>
  </div>
  <!-- Innehåll... -->
</div>
```

### Nytt Svar (Grön tema)

```html
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
  <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Nytt svar</h1>
  </div>
  <!-- Innehåll... -->
</div>
```

## Testning

### Uppdaterade Enhetstester

```bash
npm test __tests__/api/notifications.test.ts
```

**Nya testfall:**
- ✅ Single email sending för 1 mottagare
- ✅ Batch email sending för flera mottagare  
- ✅ Hantering av 0 e-post-mottagare
- ✅ Korrekt taggning och reply-to
- ✅ Preferences-filtrering

### Test-checklist

- [x] Nya meddelanden triggar notifikationer
- [x] Svar skickas endast till deltagare
- [x] Författare får inte notifikationer om sina egna meddelanden
- [x] Inställningar respekteras korrekt
- [x] Batch sending fungerar för flera mottagare
- [x] Single sending för enskilda mottagare
- [x] E-post tags tillämpas korrekt
- [x] Reply-to adress sätts
- [x] Fel hanteras gracefully

## Prestanda

### Optimeringar

- ✅ **Batch Sending**: Upp till 100 e-post per API-anrop
- ✅ **Chunking**: Automatisk uppdelning för stora grupper
- ✅ **Asynkron Processing**: Blockerar inte huvudoperationen
- ✅ **Intelligent Routing**: Single vs batch baserat på antal mottagare

### Monitoring

Via Resend Dashboard kan du övervaka:
- E-post delivery rates
- Tag-baserad filtrering
- Bounce/complaint rates
- API usage metrics

## Säkerhet

### Autentisering

- API-endpoints använder webhook-secret för autentisering
- Frontend-anrop kräver användarsession
- RLS-policies säkerställer dataåtkomst

### Rate Limiting

Resend har built-in rate limiting:
- Free tier: 100 e-post/dag
- Pro tier: Högre gränser
- Batch API: Upp till 100 e-post per anrop

## Felsökning

### Vanliga Problem

**E-post skickas inte:**
1. Kontrollera RESEND_API_KEY
2. Verifiera domän i Resend
3. Kolla webhook-autentisering
4. Kontrollera användares e-postadress

**Batch sending fungerar inte:**
1. Kontrollera antal mottagare (>1 för batch)
2. Verifiera batch.send mock i tester
3. Kolla Resend logs för fel

**Prestanda-problem:**
1. Kontrollera batch-storlek
2. Övervaka Resend rate limits
3. Optimera chunking-logik

### Debug-loggar

```javascript
console.log('[Notification] Processing', recipients.length, 'recipients');
console.log('[Notification] Sending emails to', emailRecipients.length, 'recipients, skipping', skippedCount);
console.log('[Notification] Sending', chunks.length, 'batch(es) with total', batchEmails.length, 'emails');
console.log('[Notification] Results:', { successful, skipped, failed, total });
```

## Framtida Förbättringar

### Kortterm
- [ ] E-post templates med React komponenter
- [ ] Schemalagd e-postskickning
- [ ] A/B testing av e-postmallar

### Långterm
- [ ] Push-notifikationer för mobil
- [ ] Slack/Discord-integration
- [ ] SMS-notifikationer med Resend SMS
- [ ] AI-genererade e-postsammanfattningar

## Resend API Funktioner som Används

✅ **Implementerat:**
- `resend.emails.send()` - Single e-postskickning
- `resend.batch.send()` - Batch e-postskickning  
- `reply_to` parameter
- `tags` för spårning och filtrering

🔄 **Tillgängligt för framtida implementation:**
- `resend.emails.get()` - Hämta e-poststatus
- `resend.emails.update()` - Uppdatera schemalagd e-post
- `resend.emails.cancel()` - Avbryt schemalagd e-post
- `scheduled_at` - Schemalägg e-post
- `attachments` - Bifogade filer

## Support

För teknisk support eller frågor om notifikationssystemet:

1. Kolla först denna dokumentation
2. Granska test-filen för exempel
3. Kontrollera Resend dashboard för e-poststatus
4. Öppna issue på GitHub med detaljerad information

---

**Senast uppdaterad:** 2024-01-XX  
**Version:** 2.0.0 - Med förbättrad Resend-integration 