# Migration från Markdown till Editor.js

## Översikt

Vi har framgångsrikt ersatt markdown-editorn med en säker block-baserad editor (Editor.js) för att förbättra användarupplevelsen och bibehålla säkerheten.

## Vad som har ändrats

### 🔄 **Ersatt komponenter:**

#### Innan:
- `react-markdown` för rendering av markdown-innehåll
- `<textarea>` för markdown-redigering 
- Förhandsgranskning i separata lägen

#### Efter:
- `Editor.js` block-baserad editor för redigering
- `SafeHtml` komponent för säker rendering av Editor.js output
- Real-time block-baserad redigering (som Notion)

### 📁 **Berörda filer:**

1. **Nya komponenter:**
   - `src/components/editor-js/EditorJSEditor.tsx`
   - `src/components/safe-html/SafeHtml.tsx` (uppdaterad för Editor.js)

2. **Uppdaterade komponenter:**
   - `src/components/handbook-wizard/WizardStepThree.tsx`
   - `src/app/edit-handbook/[id]/client.tsx`
   - `src/app/handbook/[subdomain]/page.tsx`

3. **Konfiguration:**
   - `package.json` - nya dependencies (Editor.js)
   - `next.config.ts` - uppdaterade optimeringar

## Säkerhetsförbättringar

### 🛡️ **XSS-skydd:**

1. **DOMPurify sanitisering:**
   ```typescript
   // Säker HTML-rendering från Editor.js JSON
   const processedHtml = convertEditorJSToHtml(content);
   const sanitizedHtml = DOMPurify.sanitize(processedHtml, {
     ALLOWED_TAGS: ['p', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a'],
     ALLOWED_ATTR: ['href', 'target', 'rel']
   });
   ```

2. **JSON-baserat innehåll:**
   - Editor.js producerar strukturerad JSON data
   - Inget rått HTML från användare
   - Säkrare än HTML-baserade editorer

3. **Block-validering:**
   - Endast tillåtna block-typer renderas
   - Okända blocks ignoreras säkert

### 🔧 **Implementerade säkerhetsåtgärder:**

- **Strukturerad data:**
  - JSON-baserat innehåll istället för HTML
  - Validering av block-struktur
  - Type-safe rendering

- **Sanitisering vid rendering:**
  - JSON konverteras till säker HTML
  - DOMPurify rengör output
  - Begränsade HTML-taggar

## Bakåtkompatibilitet

### ✅ **Befintligt innehåll:**

- HTML och Markdown-innehåll konverteras automatiskt till Editor.js blocks
- Befintliga handböcker fortsätter fungera
- Ingen dataförlust eller migrering krävs

### 🔄 **Konverteringslogik:**

```typescript
function convertContentToBlocks(content: string): OutputData {
  // Konverterar HTML/Markdown till Editor.js blocks
  // Headers: # ## ### -> header blocks (level 1, 2, 3)
  // Lists: - * 1. -> list blocks
  // Paragraphs: text -> paragraph blocks
}
```

## Editor.js Fördelar

### ⚡ **Stabilitet:**

1. **Färre runtime errors:**
   - Ingen hydration mismatches
   - Bättre Next.js kompatibilitet
   - Stabilare än TipTap

2. **Modern arkitektur:**
   - Block-baserad (som Notion)
   - Plugin-arkitektur
   - TypeScript support

3. **Bättre performance:**
   - Lazy loading av blocks
   - Optimerad för stora dokument
   - Mindre bundle size

## Användarupplevelse

### 🎯 **Förbättringar:**

- **Block-baserad redigering:** Dra och släpp blocks, enklare struktur
- **Inline verktyg:** Markering av text för formatering
- **Ren interface:** Fokus på innehåll, minimala distraktioner
- **Responsiv design:** Fungerar perfekt på alla enheter

### 🛠️ **Tillgängliga block-typer:**

- **Header:** H1, H2, H3 rubriker
- **Paragraph:** Vanlig text med inline-formatering
- **List:** Punktlistor och numrerade listor
- **Quote:** Citat med källa
- **Delimiter:** Avdelare mellan sektioner

### 🎨 **Inline verktyg:**

- **Bold:** Fet text
- **Italic:** Kursiv text
- **Link:** Hyperlänkar
- **Marker:** Markering av text

## Dependencies

### 📦 **Editor.js beroenden:**

```json
{
  "@editorjs/editorjs": "^2.28.2",
  "@editorjs/header": "^2.7.0",
  "@editorjs/list": "^1.8.0",
  "@editorjs/paragraph": "^2.9.0",
  "@editorjs/quote": "^2.5.0",
  "@editorjs/delimiter": "^1.3.0"
}
```

### ❌ **Borttagna beroenden:**

```json
{
  "@tiptap/react": "^2.12.0",
  "@tiptap/starter-kit": "^2.12.0",
  "@tiptap/extension-text-align": "^2.12.0",
  "@tiptap/extension-text-style": "^2.12.0",
  "@tiptap/extension-color": "^2.12.0",
  "@tiptap/extension-list-item": "^2.12.0"
}
```

## Framtida möjligheter

### 🚀 **Enkelt att utöka:**

1. **Fler block-typer:**
   - `@editorjs/image` - Bilduppladdning
   - `@editorjs/table` - Tabeller
   - `@editorjs/code` - Kodblock
   - `@editorjs/embed` - YouTube, Twitter embeds

2. **Advanced features:**
   - `@editorjs/undo` - Bättre undo/redo
   - `@editorjs/drag-drop` - Förbättrad drag-drop
   - Custom blocks för handbook-specifika behov

## Troubleshooting

### 🔧 **Vanliga problem:**

1. **Editor initialisering:**
   - Kontrollera att DOM element finns
   - Vänta på Editor.js ready state

2. **Konvertering av gammalt innehåll:**
   - Kontrollera convertContentToBlocks funktionen
   - Logga JSON output för debugging

3. **Styling:**
   - Editor.js använder minimal CSS
   - Lägg till custom styling efter behov

## Slutsats

Bytet från TipTap till Editor.js ger oss:

- ✅ **Bättre stabilitet** - Inga Fast Refresh errors
- ✅ **Modern UX** - Block-baserad editing som användare förväntar sig
- ✅ **Säkrare arkitektur** - JSON istället för HTML
- ✅ **Framtidssäker** - Enkel att utöka med fler funktioner
- ✅ **Bättre performance** - Mindre bundle, snabbare loading

Editor.js är en mogen, vältestad lösning som används av tusentals företag och ger oss en solid grund för framtiden. 