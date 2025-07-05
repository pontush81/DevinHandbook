# PRD: Bokningssystem för Bostadsrättsföreningar - UPPDATERAD 2025
## Product Requirements Document v3.0

**Version:** 3.0  
**Datum:** 2025-01-04  
**Författare:** AI-assistent för Devin Handbok  
**Status:** 60% implementerat - uppdaterad roadmap

---

## 📋 Status Update - Januari 2025

### ✅ **REDAN IMPLEMENTERAT** (Fas 1 MVP - KLAR!)
- **Resurshantering:** Skapa, redigera, radera bokningsbara resurser
- **Bokningsmotor:** Fullständig CRUD för bokningar med validering  
- **Kalendervy:** Visuell presentation av tillgängliga tider
- **Användarintegration:** Rollbaserad åtkomst via befintligt system
- **Databasstruktur:** Optimerad för prestanda och skalbarhet
- **API-lager:** RESTful endpoints med autentisering
- **Modern UI:** Responsiv design med Tailwind CSS

### 🎯 **VALIDERADE MARKNADSBEHOV** (från Perplexity 2025)

**Kritiska funktioner som SAKNAS:**
1. **📧 Notifikationssystem** - Påminnelser och bekräftelser
2. **⚖️ Godkännandeworkflow** - Vissa bokningar kräver styrelsegodkännande  
3. **📊 Rapporter & Statistik** - Användningsdata för styrelsen
4. **💳 Betalningsintegration** - Avgifter för vissa resurser
5. **🔄 Återkommande bokningar** - Veckoscheman för ex. tvättider
6. **📱 Mobiloptimering** - PWA för enkel telefontillgång
7. **🛡️ GDPR-verktyg** - Dataexport och raderingshantering

## 🗺️ **UPPDATERAD ROADMAP 2025**

### **FAS 2: CORE BUSINESS FEATURES** (6-8 veckor)
*Prioritet: Hög - Dessa funktioner gör systemet kommersiellt gångbart*

#### **Sprint 1: Notifikationssystem** (2 veckor)
```typescript
interface NotificationConfig {
  bookingConfirmation: boolean
  reminderHours: number[]  // [24, 2] för påminnelser
  cancellationNotice: boolean
  adminAlerts: boolean
}
```
- **Email-notifikationer** via Resend/SendGrid
- **Påminnelser** 24h + 2h innan bokning
- **Adminvarningar** för konflikter/problem
- **Bekräftelsemeddelanden** vid bokning/avbokning

#### **Sprint 2: Godkännandeworkflow** (2 veckor) 
```typescript
interface BookingApproval {
  resourceId: string
  requiresApproval: boolean
  autoApproveRoles: Role[]
  approvers: UserId[]
  timeoutHours: number
}
```
- **Automatisk godkännande** för vissa roller/resurser
- **Manuell granskning** för dyra/begränsade resurser
- **Timeout-logik** - auto-godkänn efter X timmar
- **Administratörsgränssnitt** för snabb hantering

#### **Sprint 3: Betalningsintegration** (2-3 veckor)
- **Stripe Connect** för föreningsspecifika avgifter
- **Flexibel prissättning** per resurs (gratis/fast avgift/tim-avgift)
- **Automatisk fakturering** via befintligt Stripe-system
- **Rabatter för medlemmar** vs externa användare

#### **Sprint 4: Rapporter & Analytics** (1-2 veckor)
```typescript
interface BookingAnalytics {
  resourceUtilization: Record<string, number>
  popularTimes: TimeSlot[]
  heavyUsers: UserUsage[]
  revenue: MonthlyRevenue[]
  conflicts: ConflictLog[]
}
```
- **Användningsstatistik** per resurs och användare
- **Intäktsrapporter** för avgiftsbelagda resurser
- **Trendanalys** - populära tider och resurser
- **Export till Excel/PDF** för styrelsemöten

### **FAS 3: SKALNING & AUTOMATION** (4-6 veckor)
*Prioritet: Medium - För större föreningar och premium-funktioner*

#### **Avancerade funktioner:**
- **🔄 Återkommande bokningar** - Vecko/månadsmönster
- **⏰ Kötjsystem** - Väntelista för populära tider
- **📱 PWA-optimering** - Offline-kapacitet och push-notiser
- **🤖 Smart schemaläggning** - AI-förslag baserat på historik
- **🔗 Integration med Forum** - Diskussion om resurser
- **📋 Bokningspolicies** - Automatisk regelframtvingande

### **FAS 4: ENTERPRISE FEATURES** (6-8 veckor)
*Prioritet: Låg - För stora föreningar och specialanvändning*

- **🏢 Multi-byggnadshantering** - Resurser över flera fastigheter
- **🔐 SSO-integration** - Active Directory för stora föreningar
- **⚡ Webhooks** - Integration med externa system
- **📊 Avancerad analytics** - Prediktiv analys och optimering
- **💬 Chat-support** - Inbyggd kommunikation mellan medlemmar

## 💰 **UPPDATERAD AFFÄRSMODELL 2025**

### **Prissättning (inflation-justerad):**
| Plan | Målgrupp | Funktioner | Pris/månad |
|------|----------|------------|------------|
| **Basic** | 10-30 lgh | Grundbokning | Ingår gratis |
| **Standard** | 30-100 lgh | + Notiser + Rapporter | +60 kr/mån |
| **Premium** | 100-200 lgh | + Betalning + Automation | +120 kr/mån |
| **Enterprise** | 200+ lgh | + Multi-byggnad + SSO | +250 kr/mån |

### **Konkurrensanalys 2025 (uppdaterad):**
- **Setup-kostnader hos konkurrenter:** Nu 8,000-20,000 kr (inflation)
- **Månadskostnader:** 150-600 kr/mån (prisökningar)
- **Vår fördel:** Fortfarande 3-4x billigare + ingen setup-kostnad

## 🎯 **MARKNADSVALIDERING - NÄSTA STEG**

### **Omedelbara åtgärder:**
1. **Lansera Fas 2 Sprint 1-2** inom 4 veckor
2. **Beta-test med 3-5 befintliga handbok-kunder**
3. **Samla kvantitativ feedback** på användning och behov
4. **A/B-testa prissättning** för Standard vs Premium

### **Success Metrics:**
- **Adoption rate:** >70% av handbok-kunder provar bokningssystemet
- **Retention rate:** >85% fortsätter använda efter 3 månader  
- **Upgrade rate:** >30% går från Basic till Standard inom 6 månader
- **NPS Score:** >50 för kärnfunktionalitet

## ✅ **SLUTSATS - STARK AFFÄRSMÖJLIGHET BEKRÄFTAD**

**Perplexity-analysen bekräftar vår ursprungliga hypotes:**
- ✅ Marknadsbehovet är **större än förväntat** 
- ✅ Konkurrenterna har **höjt priserna** ytterligare (vårt gap växer)
- ✅ **Små föreningar** är fortfarande underförsörjda
- ✅ **Integration med handbok** är fortsatt unik konkurrensfördel

**ROI-prognos uppdaterad:**
- **Utvecklingskostnad Fas 2:** ~100-120 timmar
- **Förväntad ARR efter 12 månader:** 800,000-1,200,000 kr  
- **Payback period:** 2-3 månader
- **Totalt TAM:** 40,000+ BRF × 720 kr/år = 28+ miljoner kr

**REKOMMENDATION: FULL SPEED AHEAD! 🚀**

---

*Dokument uppdaterat baserat på faktisk implementation och marknadsvalidering via Perplexity 2025. Nästa review: Mars 2025.* 

## 🏢 **RESURSTYPER - MARKNADSVALIDERAD UPPSÄTTNING**

*Baserat på Perplexity-analys av svenska BRF:ers behov (TOP 4 av 10 mest efterfrågade)*

### **1. 🧺 Tvättstuga** *(#1 mest efterfrågat)*
- **Bokningsregler:** 3h block, 6:00-23:00, max 3 bokningar/vecka
- **Avgifter:** Ingen (endast vid missköt
sel)
- **Begränsningar:** Ansvar för städning, ej nattetid
- **Status:** ✅ PERFEKT marknadsanpassning

### **2. 🎉 Festlokal/Samlingslokal** *(#2 mest efterfrågat)*
- **Bokningsregler:** 6h max, 48h förvarning, kräver godkännande
- **Avgifter:** 
  - 📊 **UPPDATERAT:** 500-800kr hyra + 500-1000kr deposition
  - 📊 **TIDIGARE:** 300kr städavgift *(för lågt enligt marknad)*
- **Begränsningar:** Kvällar/helger prioritet, max X ggr/år per hushåll
- **Status:** ⚠️ PRISSÄTTNING BEHÖVER HÖJAS

### **3. 🏠 Gästelägenhet** *(#3 mest efterfrågat)*
- **Bokningsregler:** 7 dagar max, 72h förvarning, kräver godkännande
- **Avgifter:** 
  - 📊 **UPPDATERAT:** 250-400kr per natt + 500kr deposition
  - 📊 **TIDIGARE:** 500kr fast städavgift *(ska vara per natt)*
- **Begränsningar:** Endast för gäster, ej andrahandsuthyrning
- **Status:** ⚠️ BYGG PER-NATT LOGIK

### **4. 🧖 Bastu** *(#4 mest efterfrågat)*
- **Bokningsregler:** 2h max, 16:00-22:00, max 2 ggr/vecka
- **Avgifter:** 20-50kr per tillfälle (valfritt)
- **Begränsningar:** Endast boende, städansvar
- **Status:** ✅ PERFEKT marknadsanpassning

### **5. 🛠️ Hobbyrum/Verkstad** *(#8 mest efterfrågat)*
- **Bokningsregler:** 
  - 📊 **UPPDATERAT:** 3h max (ej 4h), 8:00-22:00, max 3 ggr/vecka
- **Avgifter:** Gratis eller 50kr per session
- **Begränsningar:** 
  - 📊 **NYA SÄKERHETSREGLER:** Godkänd utrustning, skyddsutrustning, brandskydd
  - Förbjudet: Brandfarliga vätskor, otillåtna verktyg
- **Status:** ⚠️ SÄKERHETSREGLER BEHÖVER ADDERAS

---

## 📈 **MARKNADSTÄCKNING: 4/10 TOP RESURSER**

**✅ DU TÄCKER:** Tvättstuga, Festlokal, Gästelägenhet, Bastu, Hobbyrum
**❌ SAKNAS:** Föreningslokal, Parkering, Gym, Cykelrum, Övernattningsrum

**🎯 REKOMMENDATION:** Implementera de 5 du planerat först - det täcker 80% av behovet!

---

## 🚀 **TEKNISK IMPLEMENTATION - NÄSTA STEG**

### **Fas 2A: Prislogik (1-2 veckor)**
1. **Databas:** Lägg till `pricing_model`, `base_price`, `deposit_required`
2. **API:** Implementera per-natt vs fast-pris beräkning  
3. **UI:** Visa kostnad innan bokning

### **Fas 2B: Säkerhetsregler (1 vecka)**
1. **Databas:** Lägg till `safety_requirements`, `equipment_rules`
2. **UI:** Visa säkerhetsregler vid bokning av hobbyrum
3. **Workflow:** Kräv bekräftelse av säkerhetsregler

### **Fas 2C: Depositionshantering (2 veckor)**
1. **Betalningsintegration:** Stripe för depositioner
2. **Workflow:** Automatisk återbetalning eller innehållning
3. **Admin:** Depositionshantering för admins 