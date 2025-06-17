interface OutputData {
  time?: number;
  blocks: Array<{
    id?: string;
    type: string;
    data: any;
  }>;
  version?: string;
}

/**
 * Validates if the provided data is a valid EditorJS OutputData format
 */
export function isValidEditorJSData(data: any): data is OutputData {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.blocks) &&
    data.blocks.every((block: any) => 
      block &&
      typeof block === 'object' &&
      typeof block.type === 'string' &&
      block.data !== undefined
    )
  );
}

/**
 * Sanitizes and ensures EditorJS data is in the correct format
 */
export function sanitizeEditorJSData(data: any): OutputData {
  if (isValidEditorJSData(data)) {
    return data;
  }

  // If data is a string, try to parse it
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (isValidEditorJSData(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse EditorJS data string:', error);
    }
  }

  // Return empty blocks if data is invalid
  return { blocks: [] };
}

/**
 * Converts plain text to EditorJS blocks
 */
function convertPlainTextToEditorJS(text: string): OutputData {
  // Split text into paragraphs (by double newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // If no double newlines, split by single newlines but be more conservative
  const finalParagraphs = paragraphs.length === 1 
    ? [text.trim()] // Keep as single block if no clear paragraph breaks
    : paragraphs;

  const blocks: any[] = [];
  let blockIndex = 0;

  finalParagraphs.forEach((paragraph) => {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) return;

    // Check for headers (lines starting with **text**)
    const headerMatch = trimmedParagraph.match(/^\*\*(.*?)\*\*$/);
    if (headerMatch) {
      blocks.push({
        id: `block_${blockIndex++}`,
        type: 'header',
        data: {
          text: headerMatch[1].trim(),
          level: 2
        }
      });
      return;
    }

    // Check for bullet lists (lines with • or -)
    const listItems = trimmedParagraph.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('• ') || trimmed.startsWith('- ');
    });

    if (listItems.length > 0 && listItems.length === trimmedParagraph.split('\n').length) {
      // This paragraph is entirely a list
      blocks.push({
        id: `block_${blockIndex++}`,
        type: 'list',
        data: {
          style: 'unordered',
          items: listItems.map(item => item.replace(/^[•-]\s*/, '').trim())
        }
      });
      return;
    }

    // Check for mixed content (text with some list items)
    const lines = trimmedParagraph.split('\n');
    let currentTextLines: string[] = [];
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
        // If we have accumulated text, create a paragraph block first
        if (currentTextLines.length > 0) {
          const textContent = currentTextLines.join('\n').trim();
          if (textContent) {
            blocks.push({
              id: `block_${blockIndex++}`,
              type: 'paragraph',
              data: {
                text: processInlineFormatting(textContent)
              }
            });
          }
          currentTextLines = [];
        }
        
        // Create a single-item list for this line
        blocks.push({
          id: `block_${blockIndex++}`,
          type: 'list',
          data: {
            style: 'unordered',
            items: [trimmedLine.replace(/^[•-]\s*/, '').trim()]
          }
        });
      } else if (trimmedLine) {
        currentTextLines.push(trimmedLine);
      }
    });

    // Add any remaining text as a paragraph
    if (currentTextLines.length > 0) {
      const textContent = currentTextLines.join('\n').trim();
      if (textContent) {
        blocks.push({
          id: `block_${blockIndex++}`,
          type: 'paragraph',
          data: {
            text: processInlineFormatting(textContent)
          }
        });
      }
    }
  });

  return {
    time: Date.now(),
    blocks: blocks.length > 0 ? blocks : [{
      id: 'block_0',
      type: 'paragraph',
      data: { text: processInlineFormatting(text.trim()) }
    }],
    version: '2.28.2'
  };
}

/**
 * Processes inline formatting like **bold** text
 */
function processInlineFormatting(text: string): string {
  // Convert **text** to <b>text</b> for EditorJS
  return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
}

/**
 * Safely parses content string to EditorJS format
 */
export function parseEditorJSContent(content: string | null | undefined): OutputData {
  if (!content || content.trim() === '') {
    return { blocks: [] };
  }

  // First try to parse as JSON
  try {
    const parsed = JSON.parse(content);
    if (isValidEditorJSData(parsed)) {
      return parsed;
    } else {
      // If parsed but not valid EditorJS format, treat as plain text
      return convertPlainTextToEditorJS(content);
    }
  } catch (error) {
    // If JSON parsing fails, treat as plain text (no need to log this as it's expected)
    // Only log if content looks like it should be JSON (starts with { or [)
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      console.warn('Content appears to be malformed JSON, treating as plain text');
    }
    return convertPlainTextToEditorJS(content);
  }
}

/**
 * Safely stringifies EditorJS data
 */
export function stringifyEditorJSContent(data: OutputData): string {
  try {
    const sanitized = sanitizeEditorJSData(data);
    return JSON.stringify(sanitized);
  } catch (error) {
    console.error('Failed to stringify EditorJS data:', error);
    return JSON.stringify({ blocks: [] });
  }
} 