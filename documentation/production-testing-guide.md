# Säker Produktionstestning - Guide

## 🎯 Syfte
Denna guide visar hur du säkert testar betalningsflödet i produktionsmiljön utan att riskera stora summor.

## ✅ Nuvarande produktionsstatus
- **Miljö**: Produktionsmiljö (NODE_ENV: production, VERCEL_ENV: production)
- **Stripe**: Live-nycklar aktiverade (sk_live_)
- **Webhooks**: Konfigurerade och aktiva
- **Nuvarande pris**: 1490 kr (149000 öre)

## 🛡️ Säkra teststrategier

### **Strategi 1: Minimal kostnadstestning (Rekommenderat)**

#### Steg 1: Sänk priset temporärt
1. Gå till [Vercel Dashboard](https://vercel.com) → ditt projekt → Settings → Environment Variables
2. Hitta `HANDBOOK_PRICE` för Production environment
3. Ändra från `149000` till `300` (3 kr - Stripes minimum)
4. Spara och vänta på redeploy (ca 1-2 minuter)

#### Steg 2: Verifiera prisändringen
```bash
curl -s https://www.handbok.org/api/debug/env-check | jq '.pricing'
```

Förväntat resultat:
```json
{
  "HANDBOOK_PRICE": "300",
  "calculatedPrice": 300,
  "priceInSEK": 3
}
```

#### Steg 3: Testa betalningsflödet
1. Gå till handbok.org och skapa en testhandbok
2. Klicka "Uppgradera" - priset ska visa 3 kr
3. Använd ditt riktiga kort för att betala 3 kr
4. Verifiera att:
   - ✅ Betalningen går igenom i Stripe
   - ✅ Webhook anropas och registreras
   - ✅ Handboken aktiveras automatiskt
   - ✅ Användaren får bekräftelsemail

#### Steg 4: Återställ priset
1. Ändra `HANDBOOK_PRICE` tillbaka till `149000`
2. Spara och vänta på redeploy

### **Strategi 2: Använd Test-endpoints i produktion**

Du kan också köra test-endpoints direkt i produktionsmiljön:

```bash
# Simulera en lyckad betalning utan att betala
curl -X POST https://www.handbok.org/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handbookId": "test-handbook-id-prod",
    "userId": "test-user-id-prod", 
    "planType": "monthly"
  }'
```

Detta testar webhook-logiken utan att gå genom Stripe-betalning.

### **Strategi 3: Staging-miljö som exakt kopia**

#### Skapa staging-miljö:
1. Skapa en `staging` branch:
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. Konfigurera Vercel preview environment med:
   ```env
   # Samma som produktion men med test-nycklar
   STRIPE_SECRET_KEY_TEST=sk_test_...
   STRIPE_WEBHOOK_SECRET_TEST=whsec_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
   HANDBOOK_PRICE=300  # 3 kr för testing
   ```

3. Testa i staging med testkort: `4242 4242 4242 4242`

## 📊 Testscenarier att köra

### ✅ Grundläggande betalningsflöde
- [ ] Skapa handbok
- [ ] Klicka "Uppgradera"
- [ ] Slutför betalning (3 kr)
- [ ] Verifiera handbok aktiveras
- [ ] Kontrollera webhook-loggar

### ✅ Webhook-verifiering
- [ ] Kolla Stripe Dashboard → Webhooks → din endpoint
- [ ] Se att `checkout.session.completed` anropades
- [ ] Verifiera att metadata (userId, handbookId) skickades korrekt

### ✅ Databasuppdatering
- [ ] Kontrollera att handbok-status ändrades från "trial" till "active"
- [ ] Verifiera användarens prenumerationsstatus
- [ ] Testa åtkomst till handbok-innehåll

### ✅ Notifieringar
- [ ] Kontrollera att användaren fick bekräftelsemail
- [ ] Verifiera att admin-notifieringar fungerar

## 📝 Monitoring under testning

### Stripe Dashboard
- Gå till [Stripe Dashboard](https://dashboard.stripe.com) → Payments
- Övervaka betalningar i realtid
- Kontrollera webhook-loggar

### Applikationsloggar
```bash
# Följ produktionslogs via Vercel
vercel logs --follow
```

Eller via Vercel Dashboard → Functions → View Logs

### Debug-endpoints
```bash
# Kontrollera miljöstatus
curl https://www.handbok.org/api/debug/env-check | jq .

# Testa webhook-status  
curl https://www.handbok.org/api/debug/webhook-status | jq .
```

## 🚨 Säkerhetsåtgärder

### Innan testning:
- ✅ Bekräfta att backup finns av produktionsdatan
- ✅ Informera teamet om pågående testning
- ✅ Sätt upp monitoring av betalningar

### Under testning:
- ✅ Använd bara låga testbelopp (3-10 kr max)
- ✅ Testa med ditt eget kort först
- ✅ Övervaka webhook-anrop i realtid
- ✅ Dokumentera alla observationer

### Efter testning:
- ✅ Återställ alla priser till normala värden
- ✅ Verifiera att inga test-transaktioner lämnats kvar
- ✅ Sammanställ testresultat
- ✅ Uppdatera dokumentation med findings

## 🎯 Förväntade resultat

### Framgångsrikt test:
1. **Betalning**: 3 kr debiteras från ditt kort
2. **Stripe**: Transaktionen visas som "succeeded" 
3. **Webhook**: `checkout.session.completed` anropas
4. **Databas**: Handbok-status uppdateras till "active"
5. **Användare**: Får tillgång till handbok + bekräftelsemail

### Troubleshooting vanliga problem:

#### Problem: "Betalning lyckas men handbok aktiveras inte"
**Lösning**: 
- Kontrollera webhook-loggar i Stripe Dashboard
- Verifiera att webhook endpoint är korrekt konfigurerad
- Kolla applikationsloggar för fel

#### Problem: "Webhook anropas men data uppdateras inte"
**Lösning**:
- Kontrollera att metadata (userId, handbookId) skickas korrekt
- Verifiera Supabase-anslutning och behörigheter
- Testa manuellt via debug-endpoints

#### Problem: "Dubbla webhook-anrop"
**Lösning**:
- Implementera idempotency i webhook-hantering
- Kontrollera att webhook inte är konfigurerad flera gånger

## 📞 Support

Vid problem:
1. Samla webhook-loggar från Stripe
2. Exportera applikationsloggar från Vercel  
3. Dokumentera exakt fel-sekvens
4. Kontrollera med team innan större ändringar

## 💡 Tips för framtida testning

- **Automera**: Bygg automatiska tester för webhook-funktionalitet
- **Monitoring**: Sätt upp alerts för misslyckade betalningar
- **Documentation**: Håll denna guide uppdaterad baserat på findings
- **Staging**: Använd staging-miljö för regelbunden testning 