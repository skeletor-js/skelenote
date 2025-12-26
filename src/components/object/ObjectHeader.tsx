import { useState, useRef, useEffect, useCallback } from 'react';
import './ObjectHeader.css';
import type { EphemeraObject, TypeDefinition } from '@/lib/types';

interface ObjectHeaderProps {
  object: EphemeraObject;
  typeDef: TypeDefinition;
  onTitleChange: (newTitle: string) => void;
}

export function ObjectHeader({ object, typeDef, onTitleChange }: ObjectHeaderProps) {
  // Determine which property holds the title (varies by type)
  const titlePropertyId = object.properties.title !== undefined ? 'title' : 'name';
  const currentTitle = String(object.properties[titlePropertyId] ?? 'Untitled');

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editValue when object changes
  useEffect(() => {
    setEditValue(currentTitle);
  }, [currentTitle]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setEditValue(currentTitle);
    setIsEditing(true);
  }, [currentTitle]);

  const saveEdit = useCallback(() => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== currentTitle) {
      onTitleChange(trimmedValue);
    }
    setIsEditing(false);
  }, [editValue, currentTitle, onTitleChange]);

  const cancelEdit = useCallback(() => {
    setEditValue(currentTitle);
    setIsEditing(false);
  }, [currentTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  const handleTitleClick = useCallback(() => {
    if (!isEditing) {
      startEditing();
    }
  }, [isEditing, startEditing]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startEditing();
      }
    },
    [startEditing]
  );

  return (
    <header className="object-header">
      <span className="object-header__icon" aria-hidden="true">
        {typeDef.icon}
      </span>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="object-header__input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          aria-label="Edit title"
        />
      ) : (
        <h1
          className="object-header__title"
          onClick={handleTitleClick}
          onKeyDown={handleTitleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Edit title: ${currentTitle}`}
        >
          {currentTitle}
          <span className="object-header__edit-hint">Click to edit</span>
        </h1>
      )}
    </header>
  );
}
