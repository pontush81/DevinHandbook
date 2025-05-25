import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { MarkdownEditor } from './MarkdownEditor';
import { Check, X, Edit3, FileText } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  type?: 'text' | 'textarea';
  placeholder?: string;
  className?: string;
  editClassName?: string;
  displayClassName?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  showEditIcon?: boolean;
  useMarkdownEditor?: boolean;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  onCancel,
  type = 'text',
  placeholder = 'Klicka för att redigera',
  className = '',
  editClassName = '',
  displayClassName = '',
  multiline = false,
  rows = 3,
  disabled = false,
  showEditIcon = true,
  useMarkdownEditor = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current && !useMarkdownEditor) {
      inputRef.current.focus();
      // Select all text for easier editing
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      } else if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
      }
    }
  }, [isEditing, useMarkdownEditor]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey && (type === 'textarea' || multiline)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    const isMultilineEdit = type === 'textarea' || multiline;
    
    return (
      <div className={`inline-edit-container ${className}`}>
        <div className="flex flex-col space-y-2">
          {/* Editor */}
          {isMultilineEdit && useMarkdownEditor ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>Markdown-editor med förhandsvisning</span>
              </div>
              <MarkdownEditor
                content={editValue}
                onChange={setEditValue}
                placeholder={placeholder}
                className={`inline-edit-input ${editClassName}`}
                disabled={disabled}
                rows={rows}
              />
            </div>
          ) : (
            (() => {
              const InputComponent = isMultilineEdit ? Textarea : Input;
              return (
                <InputComponent
                  ref={inputRef as any}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className={`inline-edit-input ${editClassName}`}
                  rows={isMultilineEdit ? rows : undefined}
                />
              );
            })()
          )}
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 px-3"
            >
              <Check className="w-3 h-3 mr-1" />
              Spara
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-8 px-3"
            >
              <X className="w-3 h-3 mr-1" />
              Avbryt
            </Button>
            {isMultilineEdit && !useMarkdownEditor && (
              <div className="text-xs text-gray-500 flex items-center ml-2">
                <FileText className="w-3 h-3 mr-1" />
                Tips: Använd Markdown för formatering (**fet**, *kursiv*, # rubriker)
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-edit-display group relative cursor-pointer ${className} ${displayClassName}`}
      onClick={handleStartEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-50/30 hover:border-blue-200 border border-transparent rounded-lg p-2 transition-all'}`}>
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
      
      {showEditIcon && isHovered && !disabled && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 rounded-full p-1">
          <Edit3 className="w-3 h-3 text-blue-600" />
        </div>
      )}
    </div>
  );
}; 