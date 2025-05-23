# Ikoner i Handbok-projektet

## Översikt

Projektet stöder flera olika ikonbibliotek för att ge flexibilitet i designval. Alla alternativ är redan installerade och redo att användas. **Ikonerna mappar automatiskt till dina handbok-sektioner baserat på sektionsnamn!**

## Automatisk Ikonmappning

Systemet känner igen svenska handbok-sektioner och väljer lämpliga ikoner automatiskt:

| Sektionsnamn (exempel) | Emoji | Beskrivning |
|------------------------|-------|-------------|
| "Välkommen" | 👋 | Välkomstsektion |
| "Kontaktuppgifter och styrelse" | 📞 | Kontaktinformation |
| "Sopsortering och återvinning" | ♻️ | Miljö och återvinning |
| "Parkering och garage" | 🚗 | Parkering |
| "Felanmälan" | ⚠️ | Fel och support |
| "Trivselregler" | 💝 | Regler för trivsam samvaro |
| "Stadgar och årsredovisning" | 📋 | Juridiska dokument |
| "Dokumentarkiv" | 🗃️ | Arkiv och dokumentation |

> **Smart mappning:** Systemet hittar ikoner även för partiella matchningar. "Kontakt", "Kontaktuppgifter", "Kontaktinfo" ger alla telefon-ikonen 📞.

## Tillgängliga Ikonbibliotek

### 1. Emojis 🎨 (Rekommenderat)
**Fördelar:**
- Inga extra dependencies
- Universellt stöd
- Färgglada och intuitiva
- Perfekt för handboksektioner
- Automatisk mappning till svenska sektionsnamn

**Användning:**
```tsx
import { getHandbookSectionIcon } from '@/lib/handbook-icons-mapping'

// Direkt användning
const emoji = getHandbookSectionIcon('Kontaktuppgifter', 'emoji') // 📞
```

### 2. Lucide React (Standardval för shadcn/ui)
**Fördelar:**
- Standardbibliotek för shadcn/ui
- Konsistent design
- Över 1000 ikoner
- Skalbar SVG

**Användning:**
```tsx
import { getHandbookSectionIcon } from '@/lib/handbook-icons-mapping'

const IconComponent = getHandbookSectionIcon('Kontaktuppgifter', 'lucide')
<IconComponent className="h-5 w-5 text-blue-600" />
```

### 3. Heroicons, Material Design, Font Awesome
Alla tillgängliga genom samma API med automatisk mappning.

## Uppdatera Din Befintliga Handbok

### 1. HandbookSectionCard (Redan uppdaterad!)
Din befintliga `HandbookSectionCard` har redan uppdaterats för att visa ikoner automatiskt:

```tsx
// Gamla sättet (fungerar fortfarande)
<HandbookSectionCard 
  title="Kontaktuppgifter och styrelse"
  description="Information om styrelsen och viktiga kontakter"
/>

// Nya alternativ
<HandbookSectionCard 
  title="Kontaktuppgifter och styrelse"
  description="Information om styrelsen och viktiga kontakter"
  iconType="emoji"      // eller "lucide", "material", "fontawesome"
  showIcon={true}       // true som standard
/>
```

### 2. Navigation och Sidebars
Använd nya `HandbookNavigation` komponenten:

```tsx
import { HandbookNavigation } from '@/components/HandbookNavigation'

<HandbookNavigation 
  sections={handbook.sections}
  iconType="emoji"
  showIcons={true}
  activeSection={currentSection}
/>
```

### 3. Sektionsrubriker
Använd `HandbookSectionHeader` för konsistent styling:

```tsx
import { HandbookSectionHeader } from '@/components/HandbookSectionHeader'

<HandbookSectionHeader 
  title={section.title}
  description={section.description}
  iconType="emoji"
  level={2}
/>
```

### 4. Dina Befintliga Sidor (Redan uppdaterade!)
Följande sidor har redan uppdaterats med ikoner:
- ✅ `HomeHandbookClient.tsx` - Emoji-ikoner i rubriker
- ✅ `HandbookClient.tsx` - Ikoner i navigation och rubriker  
- ✅ `HandbookSectionCard.tsx` - Automatiska ikoner

## Komponenter

### HandbookSectionCard (Uppdaterad)
Automatiskt stöd för ikoner baserat på sektionsnamn:

```tsx
<HandbookSectionCard 
  title="Sopsortering och återvinning"
  description="Hur du sorterar sopor"
  iconType="emoji" // Visar ♻️ automatiskt
/>
```

### HandbookNavigation (Ny)
Navigation med ikoner:

```tsx
<HandbookNavigation 
  sections={sections}
  iconType="emoji"
  onSectionClick={(id) => scrollToSection(id)}
/>
```

### HandbookSectionHeader (Ny)
Sektionsrubriker med ikoner:

```tsx
<HandbookSectionHeader 
  title="Parkering och garage"
  description="Information om parkering"
  level={2}
/>
```

## Demo och Inställningar

### Testa Alla Ikoner
Besök `/icon-demo` för att se alla ikontyper i aktion.

### Anpassa Dina Inställningar  
Besök `/handbook-settings` för att:
- Välja ikontyp för hela handboken
- Se förhandsvisning av alla alternativ
- Få implementation-guide

## API Reference

### getHandbookSectionIcon()
```tsx
function getHandbookSectionIcon(
  title: string, 
  iconType: 'emoji' | 'lucide' | 'hero' | 'material' | 'fontawesome' = 'emoji'
): string | React.ComponentType

// Exempel
getHandbookSectionIcon('Kontakt', 'emoji')     // '📞'
getHandbookSectionIcon('Kontakt', 'lucide')    // Phone (React component)
```

### hasIconForTitle()
```tsx
function hasIconForTitle(title: string): boolean

// Kontrollera om en ikon finns
hasIconForTitle('Kontaktuppgifter') // true
hasIconForTitle('Okänd sektion')    // false
```

## Riktlinjer

### Val av Ikontyp
- **Handbok-sektioner:** Emojis (🏠 📞 🚗) - mest intuitivt
- **UI-navigering:** Lucide - konsistent med shadcn/ui
- **Admin-gränssnitt:** Material eller Font Awesome

### SEO och Tillgänglighet
Alla komponenter inkluderar automatiskt:
- `role="img"` och `aria-label` för emojis
- `aria-hidden="true"` för dekorativa SVG-ikoner
- Semantisk HTML-struktur

### Stöd för Nya Sektioner
Lägg till nya sektioner i `handbook-icons-mapping.ts`:

```tsx
export const handbookIconMapping = {
  // ... befintliga
  'ny_sektion': {
    emoji: '🆕',
    lucide: Plus,
    material: MdAdd,
    fontawesome: FaPlus
  }
}
```

## Tester
Fullständig testsvit för:
- ✅ Automatisk ikonmappning
- ✅ Alla ikontyper 
- ✅ Felmedelanden
- ✅ Verkliga handbok-sektioner
- ✅ Komponentrendering

Kör tester: `npm test handbook-icons-mapping.test.ts`

## Migration från Gammal Kod

Om du har anpassade ikon-funktioner, kan du migrera så här:

```tsx
// Gammalt sätt
const getSectionIcon = (title) => {
  if (title.includes('kontakt')) return <PhoneIcon />
  // ...
}

// Nytt sätt  
import { getHandbookSectionIcon } from '@/lib/handbook-icons-mapping'
const IconComponent = getHandbookSectionIcon(title, 'lucide')
```

**Resultat:** Alla dina handbok-sektioner får automatiskt lämpliga, snygga ikoner! 🎉 