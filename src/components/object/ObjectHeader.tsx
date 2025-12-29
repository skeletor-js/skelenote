import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigation } from '@/contexts';
import './ObjectHeader.css';
import type { SkelenoteObject, TypeDefinition } from '@/lib/types';

interface ObjectHeaderProps {
  object: SkelenoteObject;
  typeDef: TypeDefinition;
  onTitleChange: (newTitle: string) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  /** Which pane this header is in */
  paneType?: 'primary' | 'secondary';
  /** Callback to close split view (secondary pane only) */
  onCloseSplit?: () => void;
  /** Callback to view object history in Time Machine */
  onViewHistory?: () => void;
}

export function ObjectHeader({
  object,
  typeDef,
  onTitleChange,
  onDelete,
  canDelete = true,
  paneType = 'primary',
  onCloseSplit,
  onViewHistory,
}: ObjectHeaderProps) {
  const { openInSplit, splitPane } = useNavigation();
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

      {/* Open in Split View - only show in primary pane when split is not open */}
      {paneType === 'primary' && !splitPane.isOpen && (
        <button
          type="button"
          className="object-header__split-btn"
          onClick={() => openInSplit(object.id)}
          aria-label="Open in split view"
          title="Open in split view"
        >
          Split
        </button>
      )}

      {/* History button - only show in primary pane when not in version comparison mode */}
      {paneType === 'primary' && onViewHistory && splitPane.mode !== 'version-comparison' && (
        <button
          type="button"
          className="object-header__history-btn"
          onClick={onViewHistory}
          aria-label={`View history for ${currentTitle}`}
          title="View history"
        >
          History
        </button>
      )}

      {canDelete && onDelete && (
        <button
          type="button"
          className="object-header__delete"
          onClick={onDelete}
          aria-label="Delete object"
          title="Delete"
        >
          Delete
        </button>
      )}

      {paneType === 'secondary' && onCloseSplit && (
        <button
          type="button"
          className="object-header__close-split"
          onClick={onCloseSplit}
          aria-label="Close split view"
          title="Close"
        >
          ×
        </button>
      )}
    </header>
  );
}
