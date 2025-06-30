# Analys av Subscription-logik - Handbok.org

## 🎯 **Nuvarande Status**

### ✅ **Fungerar Korrekt**

#### **1. Nya Abonnemang**
- **Månadsabonnemang**: 149 kr/månad (14900 öre)
- **Årsabonnemang**: 1490 kr/år (149000 öre)
- **Stripe-integration**: Korrekt webhook-hantering
- **Database-mappning**: `yearly` -> `annual`, `monthly` -> `monthly`

#### **2. Trial-till-Betald Konvertering**
```sql
-- Handbok markeras som betald
UPDATE handbooks SET trial_end_date = NULL WHERE id = handbook_id;

-- Subscription skapas
INSERT INTO subscriptions (status, plan_type, expires_at, ...) 
VALUES ('active', 'annual', stripe_period_end, ...);
```

#### **3. Webhook-hantering**
- ✅ `checkout.session.completed` - Skapar subscription
- ✅ `customer.subscription.updated` - Uppdaterar expires_at
- ✅ `customer.subscription.deleted` - Avbryter och startar offboarding

---

## ⚠️ **Identifierade Problem**

### **Problem 1: Otydlig Expires_At Hantering**
**Nuvarande situation:**
```typescript
// expires_at sätts från Stripe, men används inte konsekvent för åtkomstkontroll
subscription.expires_at = new Date(stripe.current_period_end * 1000)
```

**Problem:**
- `expires_at` uppdateras via webhooks
- Men ingen explicit kontroll av detta datum för att blockera åtkomst
- Cron-jobbet kan hantera detta, men logiken är inte tydlig

**Rekommendation:**
```typescript
// Lägg till explicit expires_at kontroll i åtkomstlogik
const isSubsciptionExpired = (expiresAt: string) => {
  return new Date() > new Date(expiresAt);
}

// Använd i handbook access kontroll
const hasAccess = subscription.status === 'active' && !isSubsciptionExpired(subscription.expires_at);
```

### **Problem 2: Flera Access-Kontrollsystem**
**Nuvarande situation:**
1. `handbooks.trial_end_date` (null = betald)
2. `subscriptions.status` (active/cancelled/expired)  
3. `account_status.can_access_handbooks` (boolean)

**Problem:**
- Kan skapa inkonsistens mellan olika kontroller
- Svårt att veta vilken som är "sanningen"
- Risk för race conditions

**Rekommendation:**
```typescript
// Skapa en central access-kontroll funktion
async function hasHandbookAccess(userId: string, handbookId: string): Promise<boolean> {
  // 1. Kontrollera handbook-nivå (primär)
  const handbook = await getHandbook(handbookId);
  if (handbook.trial_end_date === null) return true; // Betald
  
  // 2. Kontrollera subscription (sekundär)
  const subscription = await getActiveSubscription(userId, handbookId);
  if (subscription?.status === 'active' && !isExpired(subscription.expires_at)) {
    return true;
  }
  
  // 3. Kontrollera account status (fallback)
  const accountStatus = await getAccountStatus(userId);
  return accountStatus?.can_access_handbooks === true;
}
```

### **Problem 3: Saknad Automatic Expiry Check**
**Nuvarande situation:**
- Cron-jobbet körs dagligen
- Men ingen realtids-kontroll av expired subscriptions

**Rekommendation:**
```typescript
// Lägg till middleware för real-time expiry check
app.use('/handbook/:id', async (req, res, next) => {
  const hasAccess = await hasHandbookAccess(req.user.id, req.params.id);
  if (!hasAccess) {
    return res.redirect('/upgrade');
  }
  next();
});
```

---

## 🎯 **Rekommenderade Förbättringar**

### **1. Centraliserad Access-Kontroll**
```typescript
// /lib/access-control.ts
export class AccessController {
  static async hasHandbookAccess(userId: string, handbookId: string): Promise<{
    hasAccess: boolean;
    reason: string;
    subscriptionStatus: string;
  }> {
    // Implementera hierarkisk kontroll
  }
}
```

### **2. Unified Subscription Status**
```typescript
// Skapa en enda källa för subscription status
export type SubscriptionStatus = 
  | 'active'           // Betald och aktiv
  | 'trial'            // I trial-period
  | 'expired'          // Gått ut (behöver förnyelse)
  | 'cancelled'        // Uppsagd
  | 'suspended'        // Suspenderad (betalningsproblem)
  | 'none';            // Ingen subscription
```

### **3. Real-time Expiry Notifications**
```typescript
// Lägg till browser-side kontroll
setInterval(async () => {
  const status = await fetch('/api/subscription/status');
  if (status.expired) {
    showExpiryNotification();
  }
}, 60000); // Kontrollera varje minut
```

### **4. Improved Webhook Reliability**
```typescript
// Lägg till webhook-status-kontroll
export async function verifyWebhookProcessing(sessionId: string) {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const status = await checkHandbookStatus(handbookId);
    if (status.isPaid) return true;
    await delay(2000 * (i + 1)); // Exponential backoff
  }
  throw new Error('Webhook processing failed');
}
```

---

## 📊 **Test-Scenarios**

### **Viktiga test-fall att verifiera:**

1. **Månadsabonnemang**:
   - ✅ Skapas korrekt (149 kr)
   - ✅ Förnyas automatiskt varje månad
   - ❔ Blockeras när expires_at passeras

2. **Årsabonnemang**:
   - ✅ Skapas korrekt (1490 kr)  
   - ✅ Förnyas automatiskt varje år
   - ❔ Blockeras när expires_at passeras

3. **Subscription-avslut**:
   - ✅ Status sätts till 'cancelled'
   - ✅ Offboarding initieras
   - ❔ Åtkomst blockeras omedelbart vs vid period_end

4. **Trial-till-betald**:
   - ✅ trial_end_date sätts till null
   - ✅ Subscription skapas
   - ❔ Ingen race condition mellan webhook och UI

---

## 🚀 **Slutsats**

**Grundläggande logik är korrekt implementerad**, men det finns förbättringsmöjligheter:

1. **Centralisera åtkomstkontroll** - en funktion som avgör allt
2. **Förbättra expires_at hantering** - real-time kontroller
3. **Förenkla status-system** - en enda källa för sanning
4. **Lägg till robusta tester** - särskilt för edge cases

**Rekommendation**: Systemet fungerar för grundläggande fall, men behöver förstärkas för production-robusthet. 