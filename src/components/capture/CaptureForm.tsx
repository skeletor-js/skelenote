/**
 * CaptureForm - Dynamic form based on selected type
 */

import { useRef, useEffect } from 'react';
import type { CaptureType } from './TypeSelector';
import './QuickCapture.css';

interface CaptureFormProps {
  type: CaptureType;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
}

export function CaptureForm({ type, values, onChange, onSubmit }: CaptureFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus the appropriate field when type changes
  useEffect(() => {
    if (type === 'link' && urlInputRef.current) {
      urlInputRef.current.focus();
    } else if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  if (type === 'task') {
    return (
      <div className="capture-form">
        <input
          ref={titleInputRef}
          type="text"
          className="capture-form__input"
          placeholder="Task title..."
          value={values.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
    );
  }

  if (type === 'note') {
    return (
      <div className="capture-form">
        <input
          ref={titleInputRef}
          type="text"
          className="capture-form__input"
          placeholder="Note title..."
          value={values.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
    );
  }

  if (type === 'link') {
    return (
      <div className="capture-form">
        <input
          ref={urlInputRef}
          type="url"
          className="capture-form__input"
          placeholder="https://..."
          value={values.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <input
          type="text"
          className="capture-form__input"
          placeholder="Title (optional)"
          value={values.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  return null;
}
