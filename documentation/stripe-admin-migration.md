# Migration från Admin Plans till Stripe-hantering

## Bakgrund
Tidigare hade vi en admin/plans-sida för att hantera prenumerationsplaner internt. Nu när vi använder Stripe Customer Portal och Stripe för all prenumerationshantering är denna sida onödig och kan till och med skapa förvirring.

## Varför admin/plans är onödig:

### ❌ **Problematisk funktionalitet:**
1. **Ingen riktig effekt** - Ändringar sparas bara i frontend, påverkar inte systemet
2. **Duplikation** - Priser finns redan i `lib/pricing.ts` och Stripe
3. **Ingen Stripe-sync** - Planerna har inga riktiga Stripe Price IDs
4. **Förvirrande** - Kan ge intryck att man kan ändra priser utan att påverka Stripe

### ✅ **Vad som faktiskt styr systemet:**
- **Stripe Dashboard** - Riktiga produkter och priser
- **Stripe Customer Portal** - Användarhantering av prenumerationer
- **`lib/pricing.ts`** - Frontend-visning av priser
- **`create-subscription/route.ts`** - Priser som skickas till Stripe

## Rekommenderad åtgärd:

### 🗑️ **Ta bort admin/plans helt**
Eftersom all prenumerationshantering nu sker via Stripe är sidan redundant.

### 🔄 **Ersätt med Stripe-länk**
Om admin vill hantera priser ska de gå direkt till Stripe Dashboard.

### 📊 **Behåll endast statistik**
Prenumerationsstatistik kan visas på huvudadmin-sidan via Stripe API.

## Implementation:

1. **Ta bort** `src/app/admin/plans/page.tsx`
2. **Ta bort** `src/lib/plans.ts` (om den inte används någon annanstans)
3. **Uppdatera** admin-navigering för att ta bort Plans-länken
4. **Lägg till** direktlänk till Stripe Dashboard för prishantering

## Fördelar:
- ✅ Eliminerar förvirring om vad som faktiskt påverkar systemet
- ✅ Minskar kodkomplexitet
- ✅ Säkerställer att Stripe är enda sanningskällan för priser
- ✅ Minskar risk för inkonsistenta priser mellan system 