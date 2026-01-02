/**
 * CaptureForm - Dynamic form based on selected type
 */

import { useRef, useEffect } from 'react';
import { Stack, TextInput } from '@mantine/core';
import type { CaptureType } from './TypeSelector';

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
      <Stack gap="sm">
        <TextInput
          ref={titleInputRef}
          placeholder="Task title..."
          value={values.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </Stack>
    );
  }

  if (type === 'note') {
    return (
      <Stack gap="sm">
        <TextInput
          ref={titleInputRef}
          placeholder="Note title..."
          value={values.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </Stack>
    );
  }

  if (type === 'link') {
    return (
      <Stack gap="sm">
        <TextInput
          ref={urlInputRef}
          type="url"
          placeholder="https://..."
          value={values.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <TextInput
          placeholder="Title (optional)"
          value={values.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Stack>
    );
  }

  return null;
}
