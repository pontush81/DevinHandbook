# Implementeringschecklista - Juridiska texter för Handbok.org

## 📋 Vad du behöver göra för att färdigställa texterna

### 🔥 KRITISKT - Gör detta FÖRST:

#### 1. Fyll i företagsinformation
Ersätt följande platshållare i alla tre dokument:
- `[FÖRETAGSNAMN]` → Ditt registrerade företagsnamn
- `[ORGANISATIONSNUMMER]` → Ditt organisationsnummer
- `[FÖRETAGSADRESS]` → Din registrerade företagsadress
- `[TELEFONNUMMER]` → Ditt företagstelefonnummer
- `[DATUM]` → Dagens datum eller när texterna publiceras

#### 2. Kontrollera e-postadress
- Är `info@handbok.org` korrekt eller ska det vara något annat?
- Säkerställ att e-postadressen fungerar och övervakas

### ⚡ VIKTIGT - Gör detta inom kort:

#### 3. Verifiera tredjepartstjänster
Kontrollera att alla tjänster fortfarande stämmer:
- ✅ **Supabase** - för databas och autentisering
- ✅ **Stripe** - för betalningar 
- ✅ **Vercel** - för hosting
- ✅ **Resend** - för e-post

#### 4. Bekräfta priser och villkor
- ✅ **149 kr/månad eller 1490 kr/år** - är detta korrekt pris?
- ✅ **30 dagars provperiod** - stämmer detta?
- ✅ **Automatisk förnyelse** - är detta implementerat?

#### 5. Juridisk granskning
Överväg att låta en jurist granska texterna, särskilt:
- Betalningsvillkor och återbetalningspolicy
- Ansvarsbegränsningar 
- Uppsägningsvillkor

### 📁 Implementering på webbplatsen:

#### 6. Skapa sidor för juridiska texter
```
/privacy → Integritetspolicy
/terms → Användarvillkor  
/cookie-policy → Cookiepolicy
/cookie-settings → Cookie-inställningar (redan finns)
```

#### 7. Länka från viktiga platser
- ✅ Footer (redan finns delvis)
- ✅ Registreringsformulär
- ✅ Cookie-banner (redan finns)
- ⚠️ Checkout/betalning (lägg till länk till villkor)

#### 8. Uppdatera befintliga sidor
Kontrollera att dessa sidor matchar de nya texterna:
- `/privacy` - uppdatera med ny komplett version
- `/terms` - uppdatera med ny komplett version

### 🛠️ Tekniska uppdateringar:

#### 9. Kontrollera cookie-implementering
Din befintliga cookieimplementering ser bra ut, men verifiera:
- ✅ Cookie-banner visas korrekt
- ✅ "Endast nödvändiga" respekteras
- ✅ Cookie-inställningssida fungerar
- ⚠️ Lägg till länk till cookiepolicy i cookie-bannern

#### 10. Lägg till juridiska länkar i komponenter
Uppdatera dessa komponenter:
```jsx
// I cookie-bannern
<Link href="/cookie-policy">cookiepolicy</Link>

// I registreringsformulär
<p>Genom att registrera accepterar du våra 
  <Link href="/terms">användarvillkor</Link> och 
  <Link href="/privacy">integritetspolicy</Link>
</p>

// I checkout-flöde
<Checkbox>
  Jag accepterar <Link href="/terms">användarvillkoren</Link>
</Checkbox>
```

### 📧 Kommunikation:

#### 11. Meddela befintliga användare
Om du redan har användare, skicka e-post om:
- Uppdaterade villkor
- Nya integritetspolicer
- 30 dagars varsel för väsentliga ändringar

#### 12. Uppdatera support-svar
Se till att ditt supportteam känner till:
- Nya villkor och policyer
- Hur man hanterar GDPR-förfrågningar
- Kontaktinformation för juridiska frågor

### 🔍 Kvalitetskontroll:

#### 13. Testa alla länkar
- ✅ Alla interna länkar fungerar
- ✅ Externa länkar (IMY, Stripe, etc.) fungerar
- ✅ E-postlänkar öppnar e-postklient

#### 14. Mobilanpassning
Kontrollera att alla juridiska sidor:
- ✅ Är läsbara på mobil
- ✅ Har korrekt responsive design
- ✅ Cookie-banner fungerar på mobil

#### 15. SEO och tillgänglighet
- ✅ Sidtitlar och meta-beskrivningar
- ✅ Korrekt heading-struktur (H1, H2, H3)
- ✅ Alt-text för eventuella bilder

### 🌐 Internationalisering (framtida):

#### 16. Engelska versioner (valfritt)
Om du får internationella användare:
- Översätt texterna till engelska
- Lägg till språkväljare
- Tydliggör att svensk lag gäller

## 📝 Checklista för godkännande:

- [ ] Företagsinformation ifylld
- [ ] E-postadresser verifierade
- [ ] Priser och villkor bekräftade
- [ ] Tredjepartstjänster verifierade
- [ ] Sidor skapade på webbplatsen
- [ ] Länkar tillagda i footer
- [ ] Länkar tillagda i registreringsformulär
- [ ] Cookie-banner uppdaterad
- [ ] Juridisk granskning (rekommenderas)
- [ ] Befintliga användare informerade
- [ ] Alla länkar testade
- [ ] Mobilanpassning verifierad

## 🚀 Publicering:

1. **Testmiljö först**: Testa alla juridiska sidor i dev/staging
2. **Backup**: Ta backup av nuvarande sidor
3. **Publicera**: Deployera de nya sidorna
4. **Verifiera**: Kontrollera att allt fungerar i produktion
5. **Meddela**: Informera användare om uppdateringarna

## 📞 Support efter publicering:

Förbered dig på att svara på frågor om:
- Nya villkor och vad de innebär
- Hur man använder cookie-inställningar
- GDPR-rättigheter och hur man utövar dem
- Betalningsvillkor och uppsägning

---

**Uppskattat arbete:** 4-8 timmar beroende på juridisk granskning
**Kritisk deadline:** Bör vara klart innan nästa marknadsföringssatsning
**Juridisk risk:** Låg om du följer checklistan noggrant 