# Flexibel Resurskonfiguration - Design Document

## 🎯 PROBLEM: Hårdkodade regler skapar begränsningar

**Nuvarande situation:**
- Alla regler hårdkodade i kod
- Varje BRF har olika behov och priser
- Kodändringar krävs för anpassningar

## ✅ LÖSNING: Editerbara regler per resurs

### **Databasstruktur - Utökad flexibilitet:**

```sql
-- Lägg till flexibla konfigurationsfält
ALTER TABLE booking_resources ADD COLUMN resource_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE booking_resources ADD COLUMN booking_rules JSONB DEFAULT '{}';
ALTER TABLE booking_resources ADD COLUMN pricing_config JSONB DEFAULT '{}';
ALTER TABLE booking_resources ADD COLUMN time_restrictions JSONB DEFAULT '{}';
ALTER TABLE booking_resources ADD COLUMN booking_limits JSONB DEFAULT '{}';
```

### **Exempel på flexibel konfiguration:**

```typescript
// Tvättstuga - BRF A (billigt område)
booking_rules: {
  max_bookings_per_week: 3,
  advance_notice_hours: 2,
  cancellation_hours: 2
}
pricing_config: {
  base_fee: 0,
  late_cancellation_fee: 50,
  damage_deposit: 0
}
time_restrictions: {
  allowed_hours: "06:00-23:00",
  blocked_days: [],
  max_duration_hours: 3
}

// Festlokal - BRF B (premiumområde)  
booking_rules: {
  max_bookings_per_year: 2,
  advance_notice_hours: 48,
  requires_approval: true
}
pricing_config: {
  base_fee: 800,
  deposit: 1000,
  cleaning_fee: 300,
  late_cancellation_fee: 200
}
time_restrictions: {
  allowed_hours: "08:00-01:00",
  blocked_days: ["monday", "tuesday"],
  max_duration_hours: 8
}
```

## 🔧 UI-IMPLEMENTATION

### **Steg 1: Utökad Resurs-Editor**

Lägg till konfigurations-tabs i resource modal:

```typescript
<Tabs defaultValue="basic">
  <TabsList>
    <TabsTrigger value="basic">Grundinfo</TabsTrigger>
    <TabsTrigger value="pricing">Priser & Avgifter</TabsTrigger>
    <TabsTrigger value="rules">Bokningsregler</TabsTrigger>
    <TabsTrigger value="schedule">Tider & Schema</TabsTrigger>
  </TabsList>
  
  <TabsContent value="pricing">
    <PricingConfigEditor resource={resource} />
  </TabsContent>
  
  <TabsContent value="rules">
    <BookingRulesEditor resource={resource} />
  </TabsContent>
</Tabs>
```

### **Steg 2: Template-system för vanliga konfigurationer**

```typescript
const RESOURCE_TEMPLATES = {
  laundry: {
    name: "Tvättstuga",
    default_rules: {
      max_bookings_per_week: 3,
      advance_notice_hours: 2
    },
    default_pricing: {
      base_fee: 0,
      late_cancellation_fee: 50
    }
  },
  party_room: {
    name: "Festlokal", 
    default_rules: {
      max_bookings_per_year: 2,
      requires_approval: true
    },
    default_pricing: {
      base_fee: 500,
      deposit: 500
    }
  }
}

// UI: "Använd mall" dropdown med fördefinierade mallar
// Men ALLT går att redigera efter att mallen applicerats
```

## 🚀 IMPLEMENTATIONSPLAN

### **Fas 1: Databas (30 min)**
1. Lägg till JSONB-kolumner 
2. Migrera befintliga resurser till ny struktur
3. Uppdatera API:er för att hantera nya fält

### **Fas 2: Grundläggande UI (2h)**
1. Lägg till tabs i resource modal
2. Skapa enkla formulär för priser och regler
3. Validering och felhantering

### **Fas 3: Avancerade funktioner (4h)**
1. Template-system för snabb konfiguration
2. Förhandsvisning av regler
3. Import/export av konfigurationer mellan resurser

### **Fas 4: Validering & tillämpning (2h)**
1. Implementera regelvalidering i booking-processen
2. Prisberäkning vid bokning
3. Notifikationer baserat på resurskonfiguration

## 🎯 FÖRDELAR

✅ **Flexibilitet:** Varje BRF kan anpassa efter sina behov
✅ **Skalbarhet:** Inga kodändringar för nya regler
✅ **Användarvänlighet:** Templates för snabb konfiguration  
✅ **Transparens:** Tydliga regler visas för medlemmar
✅ **Professionalism:** Ser ut som kommersiell lösning

## 📊 JÄMFÖRELSE: FÖRE vs EFTER

**FÖRE (Hårdkodat):**
```typescript
// I kod - ej redigerbart
if (resourceType === 'party_room') {
  maxBookingsPerYear = 2;
  baseFee = 300; // Fast för alla BRF:er
}
```

**EFTER (Flexibelt):**
```typescript
// Från databas - helt redigerbart per resurs
const rules = resource.booking_rules;
const pricing = resource.pricing_config;
const maxBookings = rules.max_bookings_per_year || 999;
const baseFee = pricing.base_fee || 0;
```

Detta gör systemet **marknadsmässigt** - varje BRF kan konfigurera precis som de vill! 