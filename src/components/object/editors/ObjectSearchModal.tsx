/**
 * ObjectSearchModal - Modal for searching and selecting objects
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useObjects, useTypeRegistry } from '@/contexts';
import type { EphemeraObject } from '@/lib/types';
import './RelationPicker.css';

interface ObjectSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (objectId: string) => void;
  targetTypeIds?: string[];
  excludeIds?: string[];
  title?: string;
}

export function ObjectSearchModal({
  isOpen,
  onClose,
  onSelect,
  targetTypeIds,
  excludeIds = [],
  title = 'Select Object',
}: ObjectSearchModalProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter objects based on query and constraints
  const filteredObjects = useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const lowerQuery = query.toLowerCase();

    return allObjects.filter((obj: EphemeraObject) => {
      // Filter by target types if specified
      if (targetTypeIds && targetTypeIds.length > 0) {
        if (!targetTypeIds.includes(obj.typeId)) return false;
      }

      // Exclude already selected objects
      if (excludeIds.includes(obj.id)) return false;

      // Filter by name/title
      const name = (obj.properties.title ?? obj.properties.name ?? '') as string;
      return name.toLowerCase().includes(lowerQuery);
    });
  }, [store, query, targetTypeIds, excludeIds]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredObjects.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredObjects.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredObjects[selectedIndex]) {
            onSelect(filteredObjects[selectedIndex].id);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredObjects, selectedIndex, onSelect, onClose]
  );

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div className="object-search-modal__backdrop" onClick={handleBackdropClick}>
      <div className="object-search-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="object-search-modal__header">
          <h3 className="object-search-modal__title">{title}</h3>
          <button
            type="button"
            className="object-search-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="object-search-modal__input"
          placeholder="Search objects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="object-search-modal__results">
          {filteredObjects.length === 0 ? (
            <div className="object-search-modal__empty">No objects found</div>
          ) : (
            filteredObjects.slice(0, 20).map((obj, index) => {
              const typeDef = typeRegistry.get(obj.typeId);
              const icon = typeDef?.icon ?? '📄';
              const name = (obj.properties.title ?? obj.properties.name ?? 'Untitled') as string;

              return (
                <div
                  key={obj.id}
                  className={`object-search-modal__item ${index === selectedIndex ? 'object-search-modal__item--selected' : ''}`}
                  onClick={() => {
                    onSelect(obj.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="object-search-modal__item-icon">{icon}</span>
                  <span className="object-search-modal__item-name">{name}</span>
                  <span className="object-search-modal__item-type">{obj.typeId}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
}
