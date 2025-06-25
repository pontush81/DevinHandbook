# Prenumerationshantering med Stripe Customer Portal

## Översikt

Från och med nu hanteras all prenumerationshantering via **Stripe Customer Portal** - en säker, professionell lösning som låter användare hantera sina prenumerationer direkt genom Stripe.

## Vad användare kan göra

### I Customer Portal kan användare:

✅ **Säga upp prenumeration**
- Avsluta omedelbart eller vid periodens slut
- Välj anledning för uppsägning (hjälper oss förbättra tjänsten)

✅ **Uppdatera betalningsmetod**
- Byta kort
- Uppdatera faktureringsinformation
- Hantera betalningshistorik

✅ **Ladda ner fakturor**
- Alla tidigare fakturor
- Automatisk generering av kvitton

✅ **Ändra prenumerationsplan**
- Byta från månadsvis till årlig (och tvärtom)
- Automatisk proration vid ändringar

✅ **Uppdatera kontaktinformation**
- Namn, adress, telefon
- Skatteuppgifter (Tax ID)

## Hur det fungerar tekniskt

### 1. Användaren klickar "Hantera prenumeration"
```typescript
// I dashboard - för aktiva prenumerationer
<Button onClick={() => handleManageSubscription()}>
  Hantera
</Button>
```

### 2. Systemet skapar en Portal Session
```typescript
// API call till /api/stripe/create-portal-session
const response = await fetch('/api/stripe/create-portal-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    returnUrl: `${window.location.origin}/dashboard`
  })
});
```

### 3. Backend hittar Stripe Customer ID
```typescript
// Från aktiv subscription
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('stripe_customer_id')
  .eq('user_id', userId)
  .eq('status', 'active')
  .single();
```

### 4. Stripe Customer Portal skapas
```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: returnUrl,
});
```

### 5. Användaren omdirigeras till Stripe
- Säker, SSL-krypterad miljö
- Stripe's egna säkerhetsstandarder
- Automatisk hantering av PCI compliance

## Fördelar med denna lösning

### 🔒 **Säkerhet**
- Stripe hanterar all känslig betalningsinformation
- PCI DSS compliance automatiskt
- Ingen risk för säkerhetsläckor i vår kod

### 🎯 **Användarvänlighet**
- Professionell, väldesignad interface
- Stöd för 25+ språk (automatisk lokalisering)
- Mobiloptimerad design

### 🛠️ **Mindre underhåll för oss**
- Stripe uppdaterar automatiskt säkerhet och funktioner
- Ingen egen kod för prenumerationshantering
- Automatisk hantering av edge cases

### 📊 **Bättre data**
- Automatisk insamling av uppsägningsanledningar
- Detaljerad betalningshistorik
- Integrerad rapportering

## Uppsägningsprocess

### Vad händer när användare säger upp:

1. **Användaren väljer uppsägningsalternativ:**
   - Avsluta omedelbart
   - Avsluta vid periodens slut

2. **Stripe skickar webhook till oss:**
   - `customer.subscription.updated` (om cancel_at_period_end = true)
   - `customer.subscription.deleted` (vid faktisk avslutning)

3. **Vårt system uppdaterar databasen:**
   - Markerar subscription som cancelled
   - Initierar customer offboarding process
   - Loggar lifecycle event

4. **Automatisk datahantering:**
   - 60 dagar: Användaren kan exportera data
   - 90 dagar: All data raderas permanent

## Konfiguration i Stripe Dashboard

### Customer Portal inställningar:
- **Subscription management**: ✅ Aktiverat
- **Payment methods**: ✅ Aktiverat  
- **Billing history**: ✅ Aktiverat
- **Cancellation reasons**: ✅ Aktiverat
- **Retention coupons**: ❌ Inaktiverat (kan aktiveras senare)

### Anpassning:
- Logotype och färger matchar handbok.org
- Svenska som standardspråk
- Return URL: `https://handbok.org/dashboard`

## Testning

### För att testa Customer Portal:

1. Skapa en testprenumeration
2. Gå till Dashboard
3. Klicka "Hantera" på aktiv prenumeration
4. Testa alla funktioner i Stripe's testmiljö

### Test-scenarios:
- ✅ Säg upp prenumeration
- ✅ Ändra betalningsmetod  
- ✅ Ladda ner fakturor
- ✅ Uppdatera kontaktinfo
- ✅ Byt prenumerationsplan

## Framtida förbättringar

### Möjliga tillägg:
- **Retention coupons**: Erbjud rabatt vid uppsägning
- **Pause subscription**: Tillåt tillfällig paus
- **Multiple products**: Hantera flera handböcker per kund
- **Usage-based billing**: Betala per användning

## Webhook-hantering

### Viktiga webhooks att lyssna på:
```typescript
// customer.subscription.updated
// - När cancel_at_period_end ändras
// - Vid planändringar

// customer.subscription.deleted  
// - Vid faktisk uppsägning
// - Trigger offboarding process

// invoice.payment_succeeded
// - Bekräfta framgångsrik betalning
// - Uppdatera subscription status

// invoice.payment_failed
// - Hantera misslyckade betalningar
// - Skicka påminnelser
```

## Support och felsökning

### Vanliga problem:

**"Ingen prenumeration hittad"**
- Kontrollera att användaren har aktiv subscription
- Verifiera att stripe_customer_id finns i databasen

**"Portal session skapas inte"**
- Kontrollera Stripe API-nycklar
- Verifiera Customer Portal är aktiverat i Stripe Dashboard

**"Webhook når inte systemet"**
- Kontrollera webhook endpoints
- Verifiera webhook secret
- Testa med Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

*Denna lösning följer industry best practices och ger användarna full kontroll över sina prenumerationer på ett säkert och professionellt sätt.* 