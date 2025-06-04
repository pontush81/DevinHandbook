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
- **🆕 Bilder**: Bilduppladdning med automatisk storlekanpassning och bildtexter

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

### 📸 Bilduppladdning
EditorJS stöder nu fullständig bilduppladdning via Supabase Storage:

#### Funktioner:
- **Drag & Drop**: Dra bilder direkt till editorn
- **Filväljare**: Klicka för att välja bilder från datorn
- **Bildtexter**: Lägg till valfria bildtexter
- **Auto-optimering**: Bilder lagras säkert i Supabase Storage
- **Responsive**: Bilder anpassas automatiskt för olika skärmstorlekar

#### Stödda format:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- Max filstorlek: 5MB

#### Användning:
1. Tryck `/` i editorn för att öppna block-menyn
2. Välj "Image" eller skriv "image"
3. Klicka "Välj bild..." eller dra en bild till området
4. Lägg till en bildtext (valfritt)

```typescript
// Bildblock sparas i detta format:
{
  type: "image",
  data: {
    file: {
      url: "https://your-supabase-url.com/storage/v1/object/public/handbook_files/images/filename.jpg",
      name: "original-filename.jpg",
      size: 1234567,
      type: "image/jpeg"
    },
    caption: "Din bildtext här",
    withBorder: false,
    withBackground: false,
    stretched: false
  }
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

```