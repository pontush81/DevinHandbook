# EditorJS WYSIWYG Implementation

## Översikt

Vi har implementerat en fullständig WYSIWYG (What You See Is What You Get) editor baserad på EditorJS för handbokssystemet. Denna implementation fokuserar på användarvänlighet och direkt innehållsredigering.

## Funktioner

### ✅ **Core WYSIWYG Funktionalitet**
- **Direkt redigering**: Inga tabs eller preview-lägen - allt redigeras direkt i editorn
- **Realtidsuppdateringar**: Innehållet sparas automatiskt när användaren skriver
- **Visuell feedback**: Tydliga indikatorer för osparade ändringar
- **Mobiloptimerad**: Fungerar smidigt på alla enheter

### ✅ **Stödda Block-typer**
- **Headers**: H1, H2, H3, H4 med anpassade placeholders
- **Paragraf**: Standard textblock med rik formatering
- **Listor**: Både punktlistor och numrerade listor
- **Citat**: Citat med valfri källa/caption
- **Kod**: Kodblock med syntax highlighting
- **Tabeller**: Interaktiva tabeller med inline-redigering
- **Länkar**: Automatisk länk-preview och metadata
- **Varningar**: Varningsboxar för viktig information
- **Avgränsare**: Visuella sektionsavgränsare

### ✅ **Inline Formatting Tools**
- **Fet text** (Cmd/Ctrl + B)
- **Kursiv text** (Cmd/Ctrl + I)
- **Understruken text**
- **Markering/highlighting**
- **Inline kod**

## Teknisk Implementation

### Komponentstruktur

```typescript
interface EditorJSComponentProps {
  content: OutputData;           // EditorJS data format
  onChange: (data: OutputData) => void;  // Callback för ändringar
  placeholder?: string;          // Placeholder text
  className?: string;           // CSS klasser
  disabled?: boolean;           // Inaktivera editorn
  readOnly?: boolean;           // Endast läsläge
}
```

### Dataformat

EditorJS använder ett strukturerat JSON-format:

```json
{
  "time": 1234567890,
  "blocks": [
    {
      "id": "unique-id",
      "type": "header",
      "data": {
        "text": "Rubrik",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Detta är en paragraf med <b>fet text</b>."
      }
    }
  ],
  "version": "2.28.0"
}
```

## Integration med Handbokssystemet

### AllSectionsView
- **Sektionsinnehåll**: Editeras direkt med WYSIWYG
- **Sidinnehåll**: Varje sida har sin egen EditorJS-instans
- **Global redigeringsläge**: Aktiveras via header-knappen

### SinglePageView
- **Fullständig sidvy**: Fokuserad WYSIWYG-redigering
- **Auto-save**: Sparar automatiskt efter 2 sekunder inaktivitet
- **Manual save**: Knapp för omedelbar sparning

### ModernHandbookClient
- **Centraliserad editering**: Global redigeringsknapp
- **State management**: Hanterar edit-läge för hela handboken

## Användargränssnitt

### WYSIWYG Editor
```
┌─────────────────────────────────────────┐
│ WYSIWYG Editor    [•] Osparade ändringar │
│                   [?] Hjälp  [💾] Spara │
├─────────────────────────────────────────┤
│                                         │
│  # Huvudrubrik                         │
│                                         │
│  Detta är en paragraf med **fet text** │
│  och _kursiv text_.                     │
│                                         │
│  - Lista item 1                        │
│  - Lista item 2                        │
│                                         │
│  > Detta är ett citat                   │
│                                         │
└─────────────────────────────────────────┘
```

### Kortkommandon
- **Tab**: Redigera aktuellt block
- **Enter**: Skapa nytt block
- **Cmd/Ctrl + B**: Fet text
- **Cmd/Ctrl + I**: Kursiv text
- **/**: Öppna block-meny
- **@**: Länka användare (framtida funktion)

## Testning

### Test-komponenter
- **EditorJSTest**: Omfattande testgränssnitt för WYSIWYG-funktionalitet
- **Version management**: Spara och ladda olika versioner
- **Export/Import**: JSON-export för backup och överföring
- **Real-time logging**: Aktivitetslogg för debugging

### Tillgänglig på
```
http://localhost:3000/test/editorjs
```

## Performance & Optimering

### Lazy Loading
- **Dynamic imports**: EditorJS och tools laddas endast när behövs
- **Client-side endast**: Ingen SSR-konflikt
- **Minimal bundle**: Bara nödvändiga verktyg inkluderas

### Auto-save Strategi
- **Debounced saving**: 2 sekunder delay för att undvika spam
- **Visual feedback**: Tydliga indikatorer för save-status
- **Error handling**: Graceful failure med retry-logik

### Mobile Optimering
- **Touch-friendly**: Stora knappar och targets
- **Responsive design**: Anpassar sig till skärmstorlek
- **iOS scroll fix**: WebKit-optimering för smooth scrolling

## API Integration

### Content Saving
```typescript
// Sparar EditorJS data som JSON string
const saveContent = async (data: OutputData) => {
  await updatePage(pageId, {
    content: JSON.stringify(data),
    updated_at: new Date().toISOString()
  });
};
```

### Content Loading
```typescript
// Laddar och parsar EditorJS data
const loadContent = (page: Page): OutputData => {
  return page.content 
    ? JSON.parse(page.content) 
    : { blocks: [] };
};
```

## Säkerhet

### Input Sanitization
- **XSS-skydd**: EditorJS saniterar automatiskt HTML
- **Begränsade HTML-tags**: Endast tillåtna element
- **User-generated content**: Säker hantering av användarinput

### Validation
- **JSON schema**: Validering av EditorJS-data
- **Block type validation**: Kontroll av tillåtna block-typer
- **Content length limits**: Begränsningar för prestanda

## Framtida Förbättringar

### Planerade funktioner
- [ ] **Bilder**: Upload och inline bilder
- [ ] **Kommentarer**: Kollaborativ redigering
- [ ] **Version history**: Fullständig versionshantering
- [ ] **Real-time collaboration**: Multi-user editing
- [ ] **Custom blocks**: Handbok-specifika block-typer
- [ ] **Export formats**: PDF, Word, HTML export

### Tekniska förbättringar
- [ ] **Offline support**: PWA med offline editing
- [ ] **Conflict resolution**: Hantering av samtidig redigering
- [ ] **Performance monitoring**: Metrics för editor-prestanda
- [ ] **A11y improvements**: Förbättrad tillgänglighet

## Utvecklingsguide

### Lägga till nya block-typer
```typescript
// 1. Installera EditorJS plugin
npm install @editorjs/my-tool

// 2. Lägg till i EditorJSComponent
const MyTool = (await import('@editorjs/my-tool')).default;

// 3. Konfigurera i tools
tools: {
  myTool: {
    class: MyTool,
    config: {
      // Tool-specifik konfiguration
    }
  }
}
```

### Anpassa styling
```css
/* Använd CSS-klassen editor-js-container */
.editor-js-container .ce-block {
  /* Block-specifik styling */
}

.editor-js-container .ce-toolbar {
  /* Toolbar styling */
}
```

## Slutsats

WYSIWYG EditorJS-implementationen ger en modern, användarvänlig redigeringsupplevelse som:
- **Förbättrar produktivitet** genom direkt visuell redigering
- **Minskar inlärningskurvan** med intuitiva kontroller
- **Säkerställer datakvalitet** med strukturerad JSON-output
- **Skalar väl** för framtida funktioner och förbättringar

Implementationen följer modern web-standarder och best practices för en robust och underhållbar kodbas. 