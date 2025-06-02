# Devin Handbok - Omfattande Projektanalys & Helhetsplan

**Datum:** 2025-06-02 16:20  
**Status:** Akut refaktorering krävs

## 📊 NUVARANDE TILLSTÅND

### ✅ **Vad som fungerar**
- Applikationen körs och laddar data korrekt
- Supabase-integration fungerar
- Scroll-funktionalitet är återställd efter tidigare fixes
- EditorJS-komponenter finns redan implementerade
- Incognito-läge fungerar (indikerar cachingproblem)
- Terminal-loggar visar framgångsrik datahämtning

### ❌ **Kritiska problem**

#### 1. **Arkitektoniska problem**
- **ContentArea.tsx**: 719 rader (för stor - mål: <200 rader)
- **ModernHandbookClient.tsx**: 724 rader (för stor - mål: <300 rader)
- **Navigationskonflikt**: Sidebar förväntar sig page-navigation, ContentArea visar allt i scroll
- **Mixed paradigms**: En sida som scroll vs separata sidor

#### 2. **EditorJS-implementation**
- ✅ Komponenter finns (`EditorJSComponent.tsx`, `MarkdownEditor.tsx`)
- ✅ Dependencies installerade (alla @editorjs/* paket)
- ❌ **Inte integrerat i ContentArea** - använder fortfarande `dangerouslySetInnerHTML`
- ❌ Ingen edit-funktionalitet för innehåll
- ❌ Reload-problem dokumenterat men ej löst

#### 3. **Import/Export-problem**
- Sporadiska import-fel: `@/lib/services/handbook-service` vs `@/lib/handbook-service`
- Caching-problem i vanlig browser (fungerar i incognito)

## 🎯 PRIORITERAD HANDLINGSPLAN

### **FAS 1: AKUT FIX (1-2 dagar)**

#### 1.1 Fixa Navigation-paradigm
```typescript
// ContentArea.tsx ska hantera båda lägen:
if (currentPageId) {
  return <SinglePageView page={currentPage} />; // En specifik sida
} else {
  return <AllSectionsView sections={sections} />; // Scroll-översikt
}
```

#### 1.2 Dela upp ContentArea (719 → <200 rader)
```
ContentArea.tsx (80 rader - orchestration)
├── components/
│   ├── SinglePageView.tsx (150 rader)
│   ├── AllSectionsView.tsx (180 rader)
│   ├── EditModeTools.tsx (120 rader)
│   └── WelcomeContentSection.tsx (150 rader)
```

#### 1.3 Fix import-paths
- Standardisera till `@/lib/handbook-service`
- Rensa cache med `npm run build && npm run dev`

### **FAS 2: EditorJS-INTEGRATION (2-3 dagar)**

#### 2.1 Ersätt dangerouslySetInnerHTML med EditorJS
```typescript
// Före (nuvarande):
<div dangerouslySetInnerHTML={{ __html: page.content }} />

// Efter:
<EditorJSComponent
  content={page.content}
  onChange={(data) => handlePageUpdate(page.id, { content: data })}
  readOnly={!isEditMode}
/>
```

#### 2.2 Content-migration strategi
- **Steg 1**: Lägg till EditorJS parallellt med HTML-rendering
- **Steg 2**: Konvertera befintligt HTML-innehåll till EditorJS-format
- **Steg 3**: Ta bort HTML-rendering när migration är klar

#### 2.3 Lös reload-problem
- Implementera proper cleanup i `useEffect`
- Förhindra multiple editor-initializations
- Lägg till loading states

### **FAS 3: ARKITEKTONISK FÖRBÄTTRING (3-5 dagar)**

#### 3.1 Component Architecture
```
src/components/handbook/
├── ContentArea.tsx (orchestration)
├── content/
│   ├── SinglePageView.tsx
│   ├── AllSectionsView.tsx
│   ├── PageEditor.tsx (EditorJS wrapper)
│   └── SectionRenderer.tsx
├── editing/
│   ├── EditModeToolbar.tsx
│   ├── EditModeActions.tsx
│   └── SectionCreator.tsx
└── layout/
    ├── WelcomeSection.tsx
    └── ContactSection.tsx
```

#### 3.2 State Management Förbättring
- Implementera proper error boundaries
- Lägg till loading states
- Förbättra auto-save med retry-logik

#### 3.3 Mobile Optimization
- Förbättra touch-navigation
- Optimera editor för mobile
- Testa scroll-performance på olika enheter

## 🛠 TEKNISK IMPLEMENTATION

### **1. Navigation Fix**

```typescript
// ContentArea.tsx - ny struktur
export function ContentArea(props: ContentAreaProps) {
  const { currentPageId, sections, isEditMode } = props;
  
  if (currentPageId) {
    return <SinglePageView pageId={currentPageId} isEditMode={isEditMode} />;
  }
  
  return <AllSectionsView sections={sections} isEditMode={isEditMode} />;
}
```

### **2. EditorJS Integration**

```typescript
// PageEditor.tsx - ny komponent
interface PageEditorProps {
  page: Page;
  isEditMode: boolean;
  onChange: (content: OutputData) => void;
}

export function PageEditor({ page, isEditMode, onChange }: PageEditorProps) {
  return (
    <div className="min-h-[400px]">
      {isEditMode ? (
        <EditorJSComponent
          content={page.content}
          onChange={onChange}
          placeholder="Börja skriva innehåll..."
        />
      ) : (
        <EditorJSRenderer content={page.content} />
      )}
    </div>
  );
}
```

### **3. Component Splitting Strategy**

#### SinglePageView.tsx
```typescript
export function SinglePageView({ pageId, isEditMode }: Props) {
  const page = usePageData(pageId);
  
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{page.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <PageEditor 
          page={page} 
          isEditMode={isEditMode}
          onChange={handleContentChange}
        />
      </CardContent>
    </Card>
  );
}
```

#### AllSectionsView.tsx  
```typescript
export function AllSectionsView({ sections, isEditMode }: Props) {
  return (
    <div className="space-y-8">
      {sections.map(section => (
        <SectionRenderer 
          key={section.id}
          section={section}
          isEditMode={isEditMode}
        />
      ))}
    </div>
  );
}
```

## 📈 TESTNINGSSTRATEGI

### **1. Regressionstestning**
- [ ] Navigering mellan sidor fungerar
- [ ] Scroll till sektioner fungerar
- [ ] Edit-mode aktiveras/deaktiveras korrekt
- [ ] Auto-save fungerar utan cursor-hopp
- [ ] Mobile touch-navigation

### **2. EditorJS-testning**  
- [ ] Content konverteras korrekt från HTML
- [ ] Block-typer fungerar (headers, lists, etc.)
- [ ] Saving/loading av EditorJS-data
- [ ] Keyboard shortcuts
- [ ] Mobile editing experience

### **3. Performance-testning**
- [ ] Laddningstider för stora handboks-sidor
- [ ] Memory leaks vid editor-init/cleanup  
- [ ] Scroll-performance på mobile
- [ ] Cache-invalidation fungerar

## 🚀 DEPLOYMENT ROADMAP

### **Sprint 1 (v1.1)**: Navigation Fix
- Fixa ContentArea navigation-paradigm
- Dela upp ContentArea i mindre komponenter
- Fix import-paths
- **Mål**: Navigation fungerar perfekt

### **Sprint 2 (v1.2)**: EditorJS Basic
- Integrera EditorJS för edit-mode
- Behåll HTML-rendering för read-mode
- Basic content-migration
- **Mål**: Functional editor för nya sidor

### **Sprint 3 (v1.3)**: Full EditorJS
- Fullständig EditorJS-rendering
- Content-migration för befintliga sidor
- Advanced block-types
- **Mål**: Complete editor replacement

### **Sprint 4 (v1.4)**: Polish & Performance
- Mobile optimizations
- Advanced features (tables, images, etc.)
- Performance improvements
- **Mål**: Production-ready editor

## 🔧 UTVECKLINGSMILJÖ

### **Development Setup**
```bash
# 1. Säkerställ clean state
git stash
git reset --hard HEAD
npm install

# 2. Starta development
npm run dev

# 3. Testa i incognito för clean cache
```

### **File Structure Target**
```
src/components/handbook/
├── ContentArea.tsx (80 lines)
├── content/
│   ├── SinglePageView.tsx (150 lines)
│   ├── AllSectionsView.tsx (180 lines)
│   └── SectionRenderer.tsx (120 lines)
├── editor/
│   ├── PageEditor.tsx (200 lines)
│   ├── EditorJSRenderer.tsx (100 lines)
│   └── ContentMigrator.tsx (150 lines)
└── editing/
    ├── EditToolbar.tsx (100 lines)
    └── EditActions.tsx (120 lines)
```

## ⚠️ RISKANALYS

### **Höga risker**
- **EditorJS reload-problem**: Kan orsaka poor UX
- **Content-migration**: Risk för dataförlust vid konvertering
- **Mobile performance**: EditorJS kan vara tungt på mobile

### **Mitigering**
- Extensive testing av EditorJS lifecycle
- Backup-strategy för content-migration  
- Progressive enhancement för mobile

## 📋 CHECKLISTA - NÄSTA STEG

### **Omedelbart (idag)**
- [ ] Dela upp ContentArea i SinglePageView + AllSectionsView
- [ ] Fixa navigation-paradigm konflikten
- [ ] Testa att page-länkar i sidebar fungerar

### **Denna vecka**
- [ ] Integrera EditorJS i edit-mode
- [ ] Implementera PageEditor-komponent
- [ ] Testa content-saving med EditorJS-format

### **Nästa vecka**  
- [ ] Full EditorJS-rendering
- [ ] Content-migration från HTML
- [ ] Mobile optimization
- [ ] Performance testing

---

**Status**: 🔴 Kritisk - Akut åtgärd krävs för navigation  
**Nästa milstolpe**: Navigation fix inom 48h  
**Långsiktigt mål**: Fullständig EditorJS-implementation inom 2 veckor 