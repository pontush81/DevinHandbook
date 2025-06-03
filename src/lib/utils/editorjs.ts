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
 * Converts plain text to EditorJS paragraph blocks
 */
function convertPlainTextToEditorJS(text: string): OutputData {
  // Split text into paragraphs (by double newlines or single newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // If no double newlines, split by single newlines
  const finalParagraphs = paragraphs.length === 1 
    ? text.split('\n').filter(p => p.trim().length > 0)
    : paragraphs;

  const blocks = finalParagraphs.map((paragraph, index) => ({
    id: `block_${index}`,
    type: 'paragraph',
    data: {
      text: paragraph.trim()
    }
  }));

  return {
    time: Date.now(),
    blocks: blocks.length > 0 ? blocks : [{
      id: 'block_0',
      type: 'paragraph',
      data: { text: text.trim() }
    }],
    version: '2.28.2'
  };
}

/**
 * Safely parses content string to EditorJS format
 */
export function parseEditorJSContent(content: string | null | undefined): OutputData {
  if (!content) {
    return { blocks: [] };
  }

  // First try to parse as JSON
  try {
    const parsed = JSON.parse(content);
    if (isValidEditorJSData(parsed)) {
      return parsed;
    }
  } catch (error) {
    // If JSON parsing fails, treat as plain text
    console.info('Content is not JSON, converting plain text to EditorJS format');
    return convertPlainTextToEditorJS(content);
  }

  // Fallback: if JSON parsing succeeded but data is invalid, try as plain text
  return convertPlainTextToEditorJS(content);
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