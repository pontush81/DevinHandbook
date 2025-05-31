import { OutputData, BlockTool, InlineTool } from '@editorjs/editorjs';

// Extended types for our Editor.js implementation
export interface EditorBlock {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface EditorContent extends OutputData {
  blocks: EditorBlock[];
  version: string;
}

// Types for different block types
export interface HeaderBlock extends EditorBlock {
  type: 'header';
  data: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
  };
}

export interface ParagraphBlock extends EditorBlock {
  type: 'paragraph';
  data: {
    text: string;
  };
}

export interface ListBlock extends EditorBlock {
  type: 'list';
  data: {
    style: 'ordered' | 'unordered';
    items: string[];
  };
}

export interface QuoteBlock extends EditorBlock {
  type: 'quote';
  data: {
    text: string;
    caption: string;
    alignment: string;
  };
}

export interface CodeBlock extends EditorBlock {
  type: 'code';
  data: {
    code: string;
  };
}

export interface ChecklistBlock extends EditorBlock {
  type: 'checklist';
  data: {
    items: Array<{
      text: string;
      checked: boolean;
    }>;
  };
}

export interface WarningBlock extends EditorBlock {
  type: 'warning';
  data: {
    title: string;
    message: string;
  };
}

export interface DelimiterBlock extends EditorBlock {
  type: 'delimiter';
  data: Record<string, never>;
}

export interface TableBlock extends EditorBlock {
  type: 'table';
  data: {
    content: string[][];
  };
}

export interface LinkBlock extends EditorBlock {
  type: 'link';
  data: {
    link: string;
    meta: {
      title?: string;
      description?: string;
      image?: {
        url: string;
      };
    };
  };
}

// Union type for all block types
export type AnyEditorBlock = 
  | HeaderBlock
  | ParagraphBlock
  | ListBlock
  | QuoteBlock
  | CodeBlock
  | ChecklistBlock
  | WarningBlock
  | DelimiterBlock
  | TableBlock
  | LinkBlock
  | EditorBlock; // fallback for unknown types

// Configuration types
export interface EditorConfiguration {
  holder: string | HTMLElement;
  placeholder?: string;
  readOnly?: boolean;
  data?: EditorContent;
  tools?: Record<string, BlockTool | InlineTool>;
  onChange?: () => void;
  onReady?: () => void;
}

// Conversion types
export interface MarkdownConverter {
  toMarkdown: (data: EditorContent) => string;
  fromMarkdown: (markdown: string) => EditorContent;
}

// Tool configuration interfaces
export interface HeaderToolConfig {
  placeholder?: string;
  levels?: number[];
  defaultLevel?: number;
}

export interface ListToolConfig {
  defaultStyle?: 'ordered' | 'unordered';
}

export interface QuoteToolConfig {
  quotePlaceholder?: string;
  captionPlaceholder?: string;
}

export interface CodeToolConfig {
  placeholder?: string;
}

export interface TableToolConfig {
  rows?: number;
  cols?: number;
}

export interface LinkToolConfig {
  endpoint?: string;
}

// Editor state types
export interface EditorState {
  isReady: boolean;
  isChanged: boolean;
  isSaving: boolean;
  error?: string;
}

// Event types
export interface EditorChangeEvent {
  type: 'change';
  detail: {
    data: EditorContent;
  };
}

export interface EditorReadyEvent {
  type: 'ready';
  detail: {
    editor: any; // EditorJS instance
  };
}

export interface EditorSaveEvent {
  type: 'save';
  detail: {
    data: EditorContent;
  };
}

export type EditorEvent = EditorChangeEvent | EditorReadyEvent | EditorSaveEvent; 