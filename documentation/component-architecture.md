# Komponentarkitektur - Handbok.org

## ✅ Moderna komponenter som ska användas

### Huvudkomponenter
- **`ModernHandbookClient`** - Huvudkomponent för handboksvisning med inline-redigering
- **`ModernSidebar`** - Modern sidebar med shadcn/ui SidebarProvider
- **`Header`** - Header för handbokssidor med SidebarTrigger
- **`MainHeader`** - Header för landningssidor

### Mallar
- **`completeBRFHandbook`** från `@/lib/templates/complete-brf-handbook` - Rik mall med metadata och 6 sektioner

### Layout-struktur
```tsx
<SidebarProvider>
  <ModernSidebar />
  <SidebarInset>
    <Header />
    <main>
      {/* Innehåll */}
    </main>
  </SidebarInset>
</SidebarProvider>
```

## ❌ Gamla komponenter som INTE ska användas

### Borttagna komponenter
- ~~`Sidebar.tsx`~~ (gammal sidebar utan SidebarProvider)
- ~~`HandbookLayout.tsx`~~ (ersatt av ModernHandbookClient)
- ~~`HandbookClient.tsx`~~ (ersatt av ModernHandbookClient)
- ~~`menu-generator.ts`~~ (inte längre behövd)

### Borttagna mallar
- ~~`simpleTemplate`~~ (enkla inline-mallar i API-routes)
- ~~`complete-brf-handbook.ts`~~ som separat fil (nu integrerad)

## 🔍 Kontrollista innan deployment

### 1. Mallkontroll
- [ ] Alla API-routes använder `completeBRFHandbook` från `@/lib/templates/complete-brf-handbook`
- [ ] Inga inline `simpleTemplate` objekt finns kvar
- [ ] `CreateHandbookForm` använder `completeBRFHandbook`

### 2. Komponentkontroll
- [ ] Alla handbokssidor använder `ModernHandbookClient`
- [ ] Alla sidebars använder `ModernSidebar` med `SidebarProvider`
- [ ] Headers använder `SidebarTrigger` från shadcn/ui

### 3. Import-kontroll
```bash
# Kör dessa kommandon för att kontrollera:
grep -r "import.*Sidebar" src/ --include="*.tsx" --include="*.ts"
grep -r "import.*HandbookLayout" src/ --include="*.tsx" --include="*.ts"
grep -r "simpleTemplate" src/ --include="*.tsx" --include="*.ts"
```

### 4. Filstruktur-kontroll
- [ ] Inga gamla komponenter finns i `src/components/`
- [ ] Inga gamla mallar finns inline i API-routes
- [ ] Alla imports pekar på befintliga filer

## 🚀 Best Practices

### När du skapar nya handböcker
```tsx
import { completeBRFHandbook } from '@/lib/templates/complete-brf-handbook';

// Använd alltid den rika mallen
await createHandbookWithSectionsAndPages(name, subdomain, completeBRFHandbook, userId);
```

### När du visar handböcker
```tsx
import { ModernHandbookClient } from '@/components/ModernHandbookClient';

// Använd alltid ModernHandbookClient
<ModernHandbookClient 
  initialData={handbook}
  isAdmin={isAdmin}
  userId={userId}
/>
```

### När du bygger layout
```tsx
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ModernSidebar } from '@/components/ModernSidebar';

<SidebarProvider>
  <ModernSidebar />
  <SidebarInset>
    {/* Innehåll */}
  </SidebarInset>
</SidebarProvider>
```

## 🔧 Felsökning

### Om du ser fel som:
- "Cannot resolve module" → Kontrollera att du inte importerar borttagna komponenter
- "Property does not exist" → Kontrollera att du använder rätt interface från `complete-brf-handbook`
- "Hydration mismatch" → Säkerställ att du använder `mounted` state i client components

### Vanliga misstag
1. Importera `Sidebar` istället för `ModernSidebar`
2. Använda `simpleTemplate` istället för `completeBRFHandbook`
3. Glömma `SidebarProvider` wrapper
4. Använda fel header-komponent för fel typ av sida 