/**
 * TypeSelector - Type picker for Quick Capture
 * Shows Task, Note, Link as selectable options
 * Supports left/right arrow key navigation
 */

import { useCallback, useEffect } from 'react';
import './QuickCapture.css';

export type CaptureType = 'task' | 'note' | 'link';

interface TypeOption {
  id: CaptureType;
  name: string;
  icon: string;
}

const typeOptions: TypeOption[] = [
  { id: 'task', name: 'Task', icon: '✓' },
  { id: 'note', name: 'Note', icon: '📝' },
  { id: 'link', name: 'Link', icon: '🔗' },
];

interface TypeSelectorProps {
  selectedType: CaptureType;
  onSelectType: (type: CaptureType) => void;
}

export function TypeSelector({ selectedType, onSelectType }: TypeSelectorProps) {
  const currentIndex = typeOptions.findIndex((opt) => opt.id === selectedType);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : typeOptions.length - 1;
        onSelectType(typeOptions[newIndex].id);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = currentIndex < typeOptions.length - 1 ? currentIndex + 1 : 0;
        onSelectType(typeOptions[newIndex].id);
      }
    },
    [currentIndex, onSelectType]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="type-selector" role="radiogroup" aria-label="Select type">
      {typeOptions.map((option) => (
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
