import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
// Removed MarkdownEditor import as we're using EditorJS
import { Check, X, Edit3, Edit2 } from 'lucide-react';

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
  // useMarkdownEditor removed - we use EditorJS
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
  // useMarkdownEditor removed
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.type !== 'textarea') {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (editValue.trim() !== value.trim()) {
      setIsSaving(true);
      try {
        await onSave(editValue.trim());
      } catch (error) {
        console.error('Error saving:', error);
        // Revert on error
        setEditValue(value);
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Auto-save on blur (when user clicks away)
    handleSave();
  };

  if (!isEditing) {
    return (
      <div 
        className={`${className} ${displayClassName} group relative cursor-pointer`}
        onClick={disabled ? undefined : handleStartEdit}
      >
        <div className="break-words">
          {value || (
            <span className="text-gray-400 italic">{placeholder}</span>
          )}
        </div>
        {showEditIcon && !disabled && (
          <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 transform translate-x-full" />
        )}
        {isSaving && (
          <span className="text-xs text-blue-600 ml-2">Sparar...</span>
        )}
      </div>
    );
  }

  const inputProps = {
    ref: inputRef as any,
    value: editValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    className: `w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 ${editClassName}`,
    placeholder,
    disabled: isSaving
  };

  return (
    <div className={className}>
      {multiline || type === 'textarea' ? (
        <textarea {...inputProps} rows={rows} />
      ) : (
        <input {...inputProps} type="text" />
      )}
      {isSaving && (
        <div className="text-xs text-blue-600 mt-1">💾 Sparar automatiskt...</div>
      )}
    </div>
  );
}; 