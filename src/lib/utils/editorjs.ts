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
 * Safely parses content string to EditorJS format
 */
export function parseEditorJSContent(content: string | null | undefined): OutputData {
  if (!content) {
    return { blocks: [] };
  }

  try {
    const parsed = JSON.parse(content);
    return sanitizeEditorJSData(parsed);
  } catch (error) {
    console.warn('Failed to parse content as JSON:', error);
    return { blocks: [] };
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