# Editor.js Implementation Documentation

## Översikt

Vi har ersatt den tidigare markdown-editorn med Editor.js, en kraftfull block-baserad texteditor som ger en modern och intuitiv redigeringsupplevelse.

## Funktioner

### 📝 Block-baserad redigering
- **Paragraf**: Standard textblock
- **Rubriker**: H1, H2, H3, H4 med olika storlekar
- **Listor**: Både punktlistor och numrerade listor
- **Citat**: Formaterade citatiblock med författarreferens
- **Kod**: Kodblock med syntax highlighting
- **Checklista**: Interaktiva checkboxar
- **Varningar**: Framhävda varningsmeddelanden
- **Avdelare**: Visuella sektionsavdelare
- **Tabeller**: Interaktiva tabeller
- **Länkar**: Automatisk förhandsvisning av länkar

### 🎨 Inline-formattering
- **Fet text**: Markera och formatera text som fet
- **Kursiv text**: Kursiv formatering
- **Understruken text**: Understrykning
- **Inline kod**: Kodformattering i löptext
- **Markering**: Highlight-funktionalitet

### 📱 Responsiv design
- Optimerad för både desktop och mobila enheter
- Touch-vänliga kontroller på mobil
- Anpassad UI för olika skärmstorlekar

## Komponentstruktur

### EditorJSComponent
Huvudkomponenten som wrapprar Editor.js-funktionaliteten.

```typescript
interface EditorJSComponentProps {
  content: OutputData | string;
  onChange: (data: OutputData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}
```

### MarkdownEditor (Backwards Compatible)
En wrapper-komponent som behåller samma API som den tidigare markdown-editorn för bakåtkompatibilitet.

```typescript
interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}
```

## Användning

### Basic användning
```tsx
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';

function MyEditor() {
  const [content, setContent] = useState<OutputData | null>(null);

  return (
    <EditorJSComponent
      content={content}
      onChange={setContent}
      placeholder="Börja skriva..."
    />
  );
}
```

### Med markdown-kompatibilitet
```tsx
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

function MyMarkdownEditor() {
  const [content, setContent] = useState<string>('');

  return (
    <MarkdownEditor
      content={content}
      onChange={setContent}
      placeholder="Skriv markdown..."
    />
  );
}
```

## Keyboard Shortcuts

| Kombination | Funktion |
|-------------|----------|
| `Tab` | Visa alla tillgängliga block-typer |
| `/` | Sök efter block-typer |
| `Enter` | Skapa ny paragraf |
| `Ctrl/Cmd + B` | Fet text (i markerad text) |
| `Ctrl/Cmd + I` | Kursiv text (i markerad text) |
| `Ctrl/Cmd + U` | Understruken text (i markerad text) |
| `Ctrl/Cmd + K` | Skapa länk (i markerad text) |

## Block-typer

### Header (Rubrik)
```json
{
  "type": "header",
  "data": {
    "text": "Min rubrik",
    "level": 1
  }
}
```

### Paragraph (Paragraf)
```json
{
  "type": "paragraph",
  "data": {
    "text": "Det här är en paragraf med text."
  }
}
```

### List (Lista)
```json
{
  "type": "list",
  "data": {
    "style": "unordered",
    "items": ["Första punkten", "Andra punkten"]
  }
}
```

### Quote (Citat)
```json
{
  "type": "quote",
  "data": {
    "text": "Detta är ett citat",
    "caption": "Författare"
  }
}
```

### Code (Kod)
```json
{
  "type": "code",
  "data": {
    "code": "console.log('Hello World');"
  }
}
```

### Checklist (Checklista)
```json
{
  "type": "checklist",
  "data": {
    "items": [
      { "text": "Första uppgiften", "checked": false },
      { "text": "Andra uppgiften", "checked": true }
    ]
  }
}
```

### Warning (Varning)
```json
{
  "type": "warning",
  "data": {
    "title": "Viktigt!",
    "message": "Detta är en viktig varning."
  }
}
```

## Data-konvertering

### Från Markdown till Editor.js
Komponenten konverterar automatiskt markdown-text till Editor.js-format:

- `# Rubrik` → Header block (level 1)
- `## Underrubrik` → Header block (level 2)
- `- Lista` → List block (unordered)
- `1. Numrerad lista` → List block (ordered)
- `> Citat` → Quote block

### Från Editor.js till Markdown
Editor.js-data konverteras tillbaka till markdown för bakåtkompatibilitet:

```typescript
const convertEditorJSToMarkdown = (data: OutputData): string => {
  // Konverterar Editor.js-data till markdown-format
}
```

## Styling

### CSS-klasser
Editor.js-styling finns i `src/app/globals.css` under sektionen "EDITOR.JS STYLING".

Viktiga klasser:
- `.codex-editor` - Huvudcontainer
- `.ce-block` - Individuella block
- `.ce-paragraph` - Paragrafblock
- `.ce-header` - Rubrikblock
- `.cdx-list` - Listblock
- `.cdx-quote` - Citatblock

### Responsiv design
```css
@media (max-width: 640px) {
  .codex-editor {
    font-size: 16px; /* Förhindrar zoom på iOS */
  }
}
```

## Migration

### Från markdown-editor
Din befintliga kod behöver inga ändringar om du använder `MarkdownEditor`-komponenten:

```tsx
// Detta fortsätter att fungera som förut
<MarkdownEditor
  content={markdownString}
  onChange={setMarkdownString}
/>
```

### Till EditorJS direkt
För nya implementationer, använd direkt `EditorJSComponent`:

```tsx
// Ny, förbättrad editor
<EditorJSComponent
  content={editorData}
  onChange={setEditorData}
/>
```

## Testing

Komponenten är fullständigt testad med Jest och React Testing Library:

```bash
npm test EditorJSComponent
```

Tester inkluderar:
- Rendering av komponenten
- Tab-switching mellan edit och preview
- Hjälpfunktionalitet
- Mobilresponsivitet
- Content-konvertering
- Error handling

## Performance

### Optimeringar
- Lazy loading av Editor.js-verktyg
- Memoized konverteringsfunktioner
- Optimerad re-rendering
- Mobile-först approach för responsivitet

### Minnesanvändning
Editor.js instanser rensas upp automatiskt när komponenten unmountas för att förhindra minnesläckor.

## Troubleshooting

### Vanliga problem

#### Editor laddas inte
```typescript
// Kontrollera att alla dependencies är installerade
npm install @editorjs/editorjs @editorjs/header @editorjs/list
```

#### Styling ser fel ut
Kontrollera att CSS-filerna är importerade korrekt i `globals.css`.

#### TypeScript-fel
Använd de definierade typerna i `src/types/editorjs.ts`.

### Debug-tips
```typescript
// Aktivera debug-läge
const editor = new EditorJS({
  // ... andra inställningar
  logLevel: 'VERBOSE'
});
```

## Framtida utveckling

### Planerade funktioner
- [ ] Bilduppladdning via Supabase Storage
- [ ] Länkförhandsvisning API
- [ ] Custom block-typer för handboken
- [ ] Real-time collaboration
- [ ] Version history
- [ ] Export till PDF/Word

### Utbyggnadsmöjligheter
- Custom plugins för specifika behov
- Integration med AI för textförbättringar
- Avancerad formattering (tabeller, matematiska formler)
- Kommentarssystem

## Support

För frågor och support:
1. Kontrollera denna dokumentation
2. Se Editor.js officiella dokumentation: https://editorjs.io/
3. Öppna en issue i projektets repository

## Changelog

### Version 1.0.0
- Initial implementation av Editor.js
- Ersatt markdown-editor
- Full bakåtkompatibilitet
- Responsiv design
- Komplett testsvit
- Dokumentation 