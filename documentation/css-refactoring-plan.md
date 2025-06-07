# CSS Refaktoreringsplan

## Problemanalys (2025-01-07)

### Nuvarande status:
- **Filstorlek**: 64KB / 3020 rader
- **Media queries**: 59 st (mycket duplicering)
- **Problematiska deklarationer**: 33 st min-height/100vh
- **Maintainability**: Låg - svårt att hitta och ändra styles

## Refaktoreringsförslag

### 1. Uppdelning i moduler

```
src/styles/
├── globals.css (bara basics)
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── forms.css
│   ├── navigation.css
│   └── editor.css
├── layout/
│   ├── header.css
│   ├── sidebar.css
│   └── responsive.css
├── pages/
│   ├── handbook.css
│   ├── dashboard.css
│   └── messages.css
└── utilities/
    ├── typography.css
    ├── spacing.css
    └── mobile-fixes.css
```

### 2. Elimination av duplicering

**Media queries att konsolidera:**
- Mobile: `@media (max-width: 640px)`
- Tablet: `@media (max-width: 768px)`
- Desktop: `@media (max-width: 1024px)`

**CSS Custom Properties för responsiv design:**
```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  
  --header-height: 3rem;
  --sidebar-width: 16rem;
  
  --spacing-mobile: 1rem;
  --spacing-desktop: 2rem;
}
```

### 3. Ta bort problematiska globala regler

**Regler att ta bort/justera:**
- Globala `min-height: 100vh` på containers
- Överdrivna `!important` deklarationer
- Specifika `notion-section-card` styles (flytta till komponent-filer)
- Duplicerad Editor.js styling

### 4. Modernisering med CSS Container Queries

```css
/* Istället för många media queries */
@container (max-width: 768px) {
  .card {
    padding: 0.5rem;
  }
}
```

### 5. Implementation plan

#### Fas 1: Kritiska mobil-fixes (Omedelbart)
1. Ta bort globala min-height: 100vh regler
2. Skapa `mobile-fixes.css` för akuta problem
3. Flytta meddelanden-specifik CSS till egen fil

#### Fas 2: Komponent-separation (1-2 veckor)
1. Skapa komponent-baserade CSS-filer
2. Flytta Editor.js styles till `editor.css`
3. Separera navigation och sidebar styles

#### Fas 3: Media query konsolidering (2-3 veckor)
1. Konsolidera duplicerade media queries
2. Implementera CSS custom properties
3. Modernisera med container queries där möjligt

#### Fas 4: Optimering (1 vecka)
1. Ta bort unused CSS
2. Minifiera och optimera
3. Performance audit

## Förväntade resultat

### Före refaktorering:
- 64KB / 3020 rader
- 59 media queries
- Svår att maintaina

### Efter refaktorering:
- ~20-30KB total (fördelat på moduler)
- ~15-20 media queries
- Modulär och maintainbar struktur
- Snabbare laddning (bara relevanta styles laddas)

## Risker och mitigation

### Risker:
- Kan introducera breaking changes
- Kräver testning på alla sidor
- CSS-specificitets problem

### Mitigation:
- Gör inkrementella ändringar
- Behåll backup av original-fil
- Testa på staging environment först
- Använd CSS audit tools

## Nästa steg

1. **Omedelbart**: Fixa akuta mobil-problem i meddelanden
2. **Denna vecka**: Skapa `mobile-fixes.css` för kritiska issues
3. **Nästa vecka**: Börja komponent-separation
4. **Löpande**: Dokumentera CSS-konventioner för teamet 