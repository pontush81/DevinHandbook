# Kontaktformulär Setup

## Översikt
Kontaktformuläret på [handbok.org/contact](https://handbok.org/contact) är nu fullt funktionellt och skickar e-post till admin-adressen samt bekräftelsemail till användaren.

## 🚀 Funktioner

### Dubbel e-posthantering
1. **Admin-notifikation** - Skickas till `ADMIN_EMAIL` med all kontaktinformation
2. **Bekräftelsemail** - Skickas till användaren för att bekräfta att meddelandet mottagits

### Formulärvalidering
- ✅ Alla fält är obligatoriska (namn, e-post, ämne, meddelande)
- ✅ E-postvalidering med regex
- ✅ Frontend och backend-validering
- ✅ Felhantering med användarvänliga meddelanden

### UX-förbättringar
- ✅ Loading-state med spinner när meddelandet skickas
- ✅ Bekräftelsemeddelande efter framgångsrik skickning
- ✅ Felmeddelanden om något går fel
- ✅ Förhindrar dubbla inlämningar
- ✅ Responsiv design

## 🔧 Teknisk implementation

### API-endpoint
```
POST /api/contact
```

#### Request body:
```json
{
  "name": "string",
  "email": "string", 
  "subject": "string",
  "message": "string"
}
```

#### Response (framgång):
```json
{
  "success": true,
  "message": "Meddelandet har skickats framgångsrikt"
}
```

#### Response (fel):
```json
{
  "error": "Felmeddelande här"
}
```

### Miljövariabler som krävs
```bash
# Resend API för e-postskickning
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Admin e-post för kontaktförfrågningar
ADMIN_EMAIL=din@admin-email.com

# Site URL för länkar i e-post (valfri)
NEXT_PUBLIC_SITE_URL=https://handbok.org
```

## 📧 E-postmallar

### Admin-notifikation
- **Från**: `Handbok.org <noreply@handbok.org>`
- **Till**: `ADMIN_EMAIL`
- **Reply-To**: Användarens e-post (för enkla svar)
- **Ämne**: `📧 Ny kontaktförfrågan: [användarens ämne]`
- **Innehåll**: Formaterad HTML med all kontaktinformation

### Bekräftelsemail till användare
- **Från**: `Handbok.org <noreply@handbok.org>`  
- **Till**: Användarens e-post
- **Ämne**: `Tack för din kontakt - Handbok.org`
- **Innehåll**: Bekräftelse med kopia av meddelandet och nästa steg

## 🧪 Testning

### Test lokalt
1. Starta utvecklingsservern: `npm run dev`
2. Navigera till: `http://localhost:3000/contact`
3. Fyll i formuläret och skicka
4. Kontrollera:
   - Console-loggar för framgång/fel
   - Admin e-post i din inkorg
   - Bekräftelsemail till testadressen

### Test i produktion
1. Gå till: [https://handbok.org/contact](https://handbok.org/contact)
2. Fyll i kontaktformuläret
3. Verifiera att både admin och användare får e-post

## 🔍 Felsökning

### Vanliga problem

#### Inga e-post skickas
- Kontrollera att `RESEND_API_KEY` är korrekt konfigurerad
- Verifiera att `ADMIN_EMAIL` är inställd
- Kolla console-loggar för Resend-fel

#### E-post hamnar i skräppost  
- Kontrollera att domänen är verifierad i Resend
- Se till att `From`-adressen är korrekt konfigurerad

#### Formuläret laddar inte
- Kontrollera att alla komponenter importeras korrekt
- Verifiera att API-endpointen `/api/contact` är tillgänglig

### Debug-loggar
Systemet loggar följande för felsökning:
```
[Contact] Ny kontaktförfrågan mottagen: { name, email, subject, timestamp }
[Contact] Admin e-postnotifikation skickad för kontaktförfrågan från: [email]
[Contact] Bekräftelsemail skickat till: [email]
```

## 📁 Filstruktur

```
src/
├── app/
│   ├── api/
│   │   └── contact/
│   │       └── route.ts          # API-endpoint för kontaktformulär
│   └── contact/
│       ├── page.tsx              # Huvudsida för kontakt
│       ├── ContactClient.tsx     # Client-side logik och state
│       └── ContactForm.tsx       # Formulärkomponent
└── documentation/
    └── contact-form-setup.md     # Denna fil
```

## ✨ Framtida förbättringar

### Möjliga tillägg:
- [ ] Spara kontaktförfrågningar i databas för statistik
- [ ] Auto-svar baserat på ämne/kategori
- [ ] Integrering med supportbiljett-system
- [ ] Rate limiting för att förhindra spam
- [ ] Captcha för extra säkerhet
- [ ] Slack/Discord notifikationer
- [ ] Dashboard för att hantera kontaktförfrågningar

## 🔒 Säkerhet

### Implementerade säkerhetsåtgärder:
- Input-validering på både frontend och backend
- E-post sanitisering för att förhindra XSS
- Rate limiting via Vercel (automatiskt)
- CORS-konfiguration
- Fel loggas utan att visa känslig information till användare 