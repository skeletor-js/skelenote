/**
 * TypeSelector - Type picker for Quick Capture
 * Shows Task, Note, Link, and Template as selectable options
 * Supports left/right arrow key navigation
 */

import { useCallback, useEffect } from 'react';
import './QuickCapture.css';

export type CaptureType = 'task' | 'note' | 'link' | 'template';

interface TypeOption {
  id: CaptureType;
  name: string;
  icon: string;
}

const typeOptions: TypeOption[] = [
  { id: 'task', name: 'Task', icon: '✓' },
  { id: 'note', name: 'Note', icon: '📝' },
  { id: 'link', name: 'Link', icon: '🔗' },
  { id: 'template', name: 'Template', icon: '📋' },
];

interface TypeSelectorProps {
  selectedType: CaptureType;
  onSelectType: (type: CaptureType) => void;
  /** Hide the template option (e.g., when no templates exist) */
  hideTemplate?: boolean;
}

export function TypeSelector({ selectedType, onSelectType, hideTemplate }: TypeSelectorProps) {
  const visibleOptions = hideTemplate
    ? typeOptions.filter((opt) => opt.id !== 'template')
    : typeOptions;

  const currentIndex = visibleOptions.findIndex((opt) => opt.id === selectedType);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : visibleOptions.length - 1;
        onSelectType(visibleOptions[newIndex].id);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = currentIndex < visibleOptions.length - 1 ? currentIndex + 1 : 0;
        onSelectType(visibleOptions[newIndex].id);
      }
    },
    [currentIndex, onSelectType, visibleOptions]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="type-selector" role="radiogroup" aria-label="Select type">
      {visibleOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={selectedType === option.id}
          className={`type-selector__option ${selectedType === option.id ? 'type-selector__option--selected' : ''}`}
          onClick={() => onSelectType(option.id)}
        >
          <span className="type-selector__icon">{option.icon}</span>
          <span className="type-selector__name">{option.name}</span>
        </button>
      ))}
    </div>
  );
}
