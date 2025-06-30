# Guide: Testa Betalningar Utan Att Betala

## 🎯 Översikt
Denna guide visar hur du testar ditt betalningsflöde utan att riskera riktiga pengar.

## 🧪 Metod 1: Stripe Testkort (Rekommenderat)

### Setup
1. Kontrollera att du är i testläge:
   ```bash
   npm run check-stripe
   ```

2. Starta utvecklingsservern:
   ```bash
   npm run dev
   ```

### Testkort som fungerar:
- **Standardkort:** `4242 4242 4242 4242`
- **Utgångsdatum:** Valfritt framtida datum (t.ex. `12/25`)
- **CVC:** Valfria 3 siffror (t.ex. `123`)
- **Postnummer:** Valfria 5 siffror (t.ex. `12345`)

### Andra testkort för olika scenarion:
| Kortnummer | Resultat |
|------------|----------|
| `4242 4242 4242 4242` | ✅ Betalning lyckas |
| `4000 0000 0000 0002` | ❌ Betalning nekas |
| `4000 0000 0000 3220` | 🔒 Kräver 3D Secure |
| `4000 0000 0000 9995` | 💳 Otillräckliga medel |

## 🚀 Metod 2: API Test-endpoints

### Simulera lyckad betalning:
```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "handbookId": "test-handbook-id",
    "userId": "test-user-id",
    "planType": "monthly"
  }'
```

### Testa Stripe session:
```bash
curl -X POST http://localhost:3000/api/debug/test-stripe-session \
  -H "Content-Type: application/json" \
  -d '{
    "handbookId": "test-handbook-id",
    "userId": "test-user-id",
    "planType": "yearly"
  }'
```

## 🔧 Metod 3: Stripe CLI (Avancerad)

### Installation:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe
```

### Användning:
```bash
# Logga in
stripe login

# Starta webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Simulera events
stripe trigger checkout.session.completed
```

## ✅ Verifiering av Testbetalningar

### Kontrollera betalningsstatus:
```bash
curl http://localhost:3000/api/debug/payment-status?handbookId=test-handbook-id
```

### Loggar att övervaka:
1. **Utvecklingskonsol** - Se betalningsflödet i realtid
2. **Stripe Dashboard** - Kontrollera test-transaktioner
3. **Webhook-loggar** - Verifiera att webhooks anropas

## 📊 Testscenarier att Köra

### 1. Grundläggande betalningsflöde:
- [ ] Gå till handbok-sidan
- [ ] Klicka "Uppgradera"
- [ ] Fyll i testkort: `4242 4242 4242 4242`
- [ ] Slutför betalning
- [ ] Verifiera att handbok aktiveras

### 2. Avbruten betalning:
- [ ] Starta betalningsprocessen
- [ ] Klicka "Avbryt" eller stäng fönster
- [ ] Verifiera att handbok förblir i testläge

### 3. Nekad betalning:
- [ ] Använd kortnummer: `4000 0000 0000 0002`
- [ ] Försök slutföra betalning
- [ ] Verifiera felhantering

### 4. API-simulering:
- [ ] Kör test-webhook endpoint
- [ ] Kontrollera att handbok aktiveras
- [ ] Verifiera användarnotifieringar

## 🛡️ Säkerhetsåtgärder

### Utvecklingsmiljö:
- ✅ **Alltid** använd testnyckar som börjar med `sk_test_`
- ✅ **Aldrig** använd produktionsnycklar under utveckling
- ✅ Kontrollera att `HANDBOOK_PRICE` är lågt (t.ex. 1000 öre = 10kr)

### Staging-miljö:
- ✅ Använd samma testnyckar som utveckling
- ✅ Konfigurera separat webhook-endpoint
- ✅ Testa med låga belopp

### Innan Produktionsdeploy:
- ✅ Verifiera att produktionsnycklar är korrekt konfigurerade
- ✅ Testa webhook-endpoints
- ✅ Kontrollera prissättning

## 🚨 Viktiga Tips

1. **Dubbelkolla miljö:** Kontrollera alltid att du är i testläge innan du testar
2. **Spara test-IDs:** Anteckna test-handbok-IDs och user-IDs för konsistent testning
3. **Övervaka loggar:** Håll koll på både applikations- och Stripe-loggar
4. **Rensa testdata:** Rensa testtransaktioner regelbundet i Stripe Dashboard

## 📞 Felsökning

### Problem: "Betalning går igenom men handbok aktiveras inte"
- Kontrollera webhook-konfiguration
- Verifiera att webhook-secret är korrekt
- Kolla applikationsloggar för fel

### Problem: "Kan inte skapa Stripe session"
- Kontrollera att API-nycklar är korrekt konfigurerade
- Verifiera internetanslutning
- Kontrollera Stripe Dashboard för errors

### Problem: "Testkort accepteras inte"
- Kontrollera att du använder korrekt testkortnummer
- Verifiera att du är i Stripe test mode
- Testa med olika testkort 