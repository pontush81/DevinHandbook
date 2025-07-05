# Utvecklingsstrategi: Resurstyper i Bokningssystem

## 🎯 UTMANING: Från Enkel → Sofistikerad Resurshantering

**Nuvarande:** Alla resurser behandlas likadant (namn, beskrivning, max-tid)
**Målbild:** 5 specifika resurstyper med unika regler och begränsningar

---

## 🚀 VÄG 1: EVOLUTIONÄR UTVECKLING (⭐ Rekommenderas)

### **Steg 1: Lägg till resurstyp (1-2 dagar)**
```sql
-- Utöka befintlig tabell
ALTER TABLE booking_resources ADD COLUMN resource_type VARCHAR(20) DEFAULT 'other';
ALTER TABLE booking_resources ADD COLUMN rules JSONB;
```

```typescript
// Uppdatera UI med dropdown
<Select onValueChange={(type: ResourceType) => setNewResource({...newResource, resource_type: type})}>
  <SelectItem value="laundry">🧺 Tvättstuga</SelectItem>
  <SelectItem value="sauna">🧖 Bastu</SelectItem>
  <SelectItem value="party_room">🎉 Festlokal</SelectItem>
  <SelectItem value="guest_apartment">🏠 Gästelägenhet</SelectItem>
  <SelectItem value="hobby_room">🛠️ Hobbyrum</SelectItem>
  <SelectItem value="other">📦 Övrigt</SelectItem>
</Select>
```

### **Steg 2: Använd befintliga standards (2-3 dagar)**
```typescript
// I BookingCalendar.tsx - använd ResourceTemplates
import { ResourceTemplates } from '@/lib/booking-standards';

const validateBooking = (resource, startTime, endTime) => {
  const rules = ResourceTemplates[resource.resource_type];
  // Applicera rules.maxBookingDurationHours, operatingHours osv
};
```

### **Steg 3: Gradvis validering (3-4 dagar)**
- Börja med operationstider per resurstyp
- Lägg till max bokningstid per typ
- Implementera användargränser
- Sist: städavgifter och godkännanden

### **FÖRDELAR VÄG 1:**
- ✅ Behåller befintlig funktionalitet
- ✅ Gradvis implementation 
- ✅ Kan testa varje steg
- ✅ Användare ser förbättringar omedelbart

---

## 🔄 VÄG 2: HYBRID-OMSKRIVNING (Måttlig risk)

### **Koncept: Dubbel datamodell**
```typescript
// Behåll enkel för bakåtkompatibilitet + lägg till avancerad
interface SimpleResource {
  name: string;
  description: string;
  max_duration_hours: number; // Befintlig
}

interface AdvancedResource extends SimpleResource {
  resource_type: ResourceType;
  rules: StandardBookingRules;
  pricing: PricingRules;
}
```

### **Migration-strategi:**
1. Befintliga resurser → `resource_type: 'other'`
2. Nya resurser → Välj specifik typ
3. Gradvis konvertering av gamla resurser

### **FÖRDELAR VÄG 2:**
- ✅ Smidig övergång
- ✅ Inga API-breaking changes
- ⚠️ Dubbel komplexitet tillfälligt

---

## 🚧 VÄG 3: TOTAL OMSKRIVNING (Hög risk)

### **Koncept: Ersätt hela datamodellen**
```sql
-- Ny tabell-struktur
CREATE TABLE resource_types (
  id UUID PRIMARY KEY,
  name VARCHAR(50),
  rules JSONB,
  pricing JSONB
);

CREATE TABLE booking_resources_v2 (
  id UUID PRIMARY KEY,
  resource_type_id UUID REFERENCES resource_types(id),
  -- Specifika fält per typ
);
```

### **NACKDELAR VÄG 3:**
- ❌ Måste migrera all data
- ❌ Risk för buggar
- ❌ Längre utvecklingstid
- ❌ Mer komplext att testa

---

## 🎯 REKOMMENDATION: VÄG 1 - EVOLUTIONÄR

**Nästa steg:**
1. **Denna vecka:** Lägg till `resource_type` kolumn + dropdown i UI
2. **Nästa vecka:** Implementera grundläggande rules-validering
3. **Vecka 3:** Operationstider per resurstyp
4. **Vecka 4:** Användargränser och avgifter

**Fördel:** Du får feedback på varje steg och kan justera baserat på användarreaktioner!

---

## 💡 KONKRET FÖRSTA STEG (30 minuter)

Vill du att jag implementerar resurstyp-dropdown i din nuvarande UI? Då kan du börja testa direkt! 