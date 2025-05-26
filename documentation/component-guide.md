# Komponentguide - Handbok.org

## Översikt

Denna guide beskriver de nya UI-komponenterna som implementerats i handboksmallen och hur de ska användas för att säkerställa konsistens och god användarupplevelse.

## Header Komponenter

### Header.tsx
**Plats:** `src/components/handbook/Header.tsx`

**Funktioner:**
- Responsiv design med mobil-först approach
- Integrerad sökfunktionalitet
- Användarmenyer med dropdown
- Support-knapp för snabb hjälp
- Redigeringsläge för behöriga användare

**Props:**
```typescript
interface HeaderProps {
  onToggleSidebar: () => void;
  onCloseSidebar?: () => void;
  handbookTitle: string;
  handbookSubtitle?: string;
  sidebarOpen?: boolean;
  canEdit?: boolean;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}
```

**Användning:**
```tsx
<Header
  onToggleSidebar={toggleSidebar}
  handbookTitle="Ekstugan 15"
  canEdit={userCanEdit}
  isEditMode={editMode}
  onToggleEditMode={toggleEditMode}
/>
```

## Navigation Komponenter

### Sidebar.tsx
**Plats:** `src/components/handbook/Sidebar.tsx`

**Funktioner:**
- Grupperad navigation med färgkodning
- Collapsible grupper för mobil
- Semantiska ikoner för varje sektion
- Hover-effekter och micro-interactions
- Redigeringsfunktionalitet

**Navigationgrupper:**
1. **KOMMA IGÅNG** (Grön) - Grundläggande information
2. **BO HÄR** (Blå) - Dagliga rutiner och regler
3. **EKONOMI & FÖRVALTNING** (Lila) - Finansiell information
4. **DOKUMENT & RESURSER** (Orange) - Arkiv och säkerhet

**Props:**
```typescript
interface SidebarProps {
  sections: HandbookSection[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  showMobileHeader?: boolean;
  isEditMode?: boolean;
  onAddSection?: (title: string, description?: string) => void;
  onUpdateSection?: (sectionId: string, updates: object) => void;
}
```

## Innehållskomponenter

### ContentArea.tsx
**Plats:** `src/components/handbook/ContentArea.tsx`

**Funktioner:**
- Hero-sektion med välkomstmeddelande
- Informationskort med ikoner
- "Viktigt att veta"-sektion
- Responsiv layout
- Redigeringsläge för innehåll

**Sektioner:**

#### Hero Section
```tsx
<section className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl px-8">
  <h1>Välkommen till Ekstugan 15! 🏡</h1>
  <p>Beskrivning av handbokens syfte...</p>
  <div className="flex gap-4">
    <Button>Rapportera fel</Button>
    <Button variant="outline">Kontakta oss</Button>
  </div>
</section>
```

#### Information Cards
```tsx
<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <InfoCard 
    icon={BookOpen}
    title="Komplett information"
    description="Allt om föreningen..."
    color="blue"
  />
  // ... fler kort
</section>
```

## UI Komponenter

### Button System

**Primär knapp:**
```tsx
<Button className="btn-primary">
  <Icon className="w-4 h-4 mr-2" />
  Knapptext
</Button>
```

**Sekundär knapp:**
```tsx
<Button variant="outline" className="btn-secondary">
  Knapptext
</Button>
```

**Storlekar:**
- `size="sm"` - Små knappar (32px höjd)
- `size="md"` - Standard (40px höjd)
- `size="lg"` - Stora knappar (48px höjd)

### Card System

**Grundkort:**
```tsx
<div className="card">
  <h3>Kortets titel</h3>
  <p>Kortets innehåll...</p>
</div>
```

**Informationskort:**
```tsx
<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-blue-600" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">Titel</h3>
  <p className="text-gray-600 text-sm">Beskrivning</p>
</div>
```

### Form Elements

**Input-fält:**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Etikett
  </label>
  <Input 
    placeholder="Placeholder text"
    value={value}
    onChange={handleChange}
  />
</div>
```

**Textarea:**
```tsx
<Textarea
  placeholder="Skriv här..."
  rows={4}
  value={value}
  onChange={handleChange}
/>
```

## Ikonsystem

### Lucide React Icons
Vi använder Lucide React för konsistenta ikoner:

**Vanliga ikoner:**
```tsx
import { 
  Home,        // Hem/välkommen
  Users,       // Kontakter/styrelse
  Phone,       // Telefon/support
  Wrench,      // Reparationer/fel
  DollarSign,  // Ekonomi
  FileText,    // Dokument
  Shield,      // Säkerhet
  MapPin,      // Platser
  Search,      // Sök
  Edit,        // Redigera
  Plus,        // Lägg till
  ChevronDown, // Dropdown
  Menu,        // Meny
  X            // Stäng
} from 'lucide-react';
```

**Användning:**
```tsx
<Icon className="w-5 h-5 text-blue-600" />
```

**Storlekar:**
- `w-4 h-4` (16px) - Små ikoner i knappar
- `w-5 h-5` (20px) - Standard ikoner
- `w-6 h-6` (24px) - Större ikoner i kort

## Färgkodning

### Navigationgrupper
```css
/* KOMMA IGÅNG */
.text-green-600 { color: #059669; }
.bg-green-50 { background: #ecfdf5; }
.bg-green-100 { background: #dcfce7; }

/* BO HÄR */
.text-blue-600 { color: #2563eb; }
.bg-blue-50 { background: #eff6ff; }
.bg-blue-100 { background: #dbeafe; }

/* EKONOMI & FÖRVALTNING */
.text-purple-600 { color: #9333ea; }
.bg-purple-50 { background: #faf5ff; }
.bg-purple-100 { background: #f3e8ff; }

/* DOKUMENT & RESURSER */
.text-orange-600 { color: #ea580c; }
.bg-orange-50 { background: #fff7ed; }
.bg-orange-100 { background: #ffedd5; }
```

## Responsiv Design

### Breakpoints
```css
/* Mobile first */
.hidden { display: none; }
.sm:flex { @media (min-width: 640px) { display: flex; } }
.md:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, 1fr); } }
.lg:grid-cols-4 { @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); } }
```

### Mobile Optimeringar
- Sidebar blir overlay på mobil
- Sökfält döljs på små skärmar
- Kort stackas vertikalt
- Touch-friendly knappar (min 44px)

## Animationer och Transitions

### Hover-effekter
```css
/* Sidebar items */
.hover\:translate-x-1:hover {
  transform: translateX(0.25rem);
}

/* Kort */
.hover\:shadow-md:hover {
  box-shadow: var(--shadow-md);
}

.hover\:-translate-y-0\.5:hover {
  transform: translateY(-0.125rem);
}
```

### Loading States
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">
</div>
```

## Tillgänglighet

### ARIA Labels
```tsx
<button
  aria-label="Öppna meny"
  aria-expanded={isOpen}
  aria-controls="sidebar-menu"
>
  <Menu className="w-5 h-5" />
</button>
```

### Fokus-hantering
```css
*:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Semantisk HTML
```tsx
<nav aria-label="Huvudnavigation">
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Sektionsrubrik</h2>
  </section>
</nav>
```

## Best Practices

### Komponentstruktur
1. **Props interface** först
2. **State och hooks** 
3. **Event handlers**
4. **Render logic**
5. **Export** sist

### CSS Klasser
1. **Layout** klasser först (flex, grid, etc.)
2. **Spacing** (margin, padding)
3. **Sizing** (width, height)
4. **Colors** (background, text)
5. **Effects** (shadow, border, etc.)
6. **Responsive** modifiers sist

### Namngivning
- **Komponenter**: PascalCase (`HeaderComponent`)
- **Props**: camelCase (`onToggleSidebar`)
- **CSS klasser**: kebab-case (`btn-primary`)
- **Filer**: kebab-case (`header-component.tsx`)

## Testning

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

test('renders header with title', () => {
  render(<Header handbookTitle="Test Handbook" />);
  expect(screen.getByText('Test Handbook')).toBeInTheDocument();
});
```

### Accessibility Testing
```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

test('should not have accessibility violations', async () => {
  const { container } = render(<Header />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Framtida Utveckling

### Planerade komponenter
- [ ] Toast notifications
- [ ] Modal dialogs
- [ ] Dropdown menus
- [ ] Progress indicators
- [ ] Data tables
- [ ] Form validation
- [ ] Dark mode toggle

### Förbättringar
- [ ] Storybook integration
- [ ] Component documentation
- [ ] Visual regression testing
- [ ] Performance monitoring 