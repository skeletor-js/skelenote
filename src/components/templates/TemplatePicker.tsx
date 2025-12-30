/**
 * Template Picker Modal
 *
 * Modal for selecting a template to create an object from.
 * Features:
 * - Search/filter templates by name
 * - Filter by target type
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Template preview on hover/selection
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTemplates } from '@/hooks';
import { useTypeRegistry } from '@/contexts';
import type { Template } from '@/lib/templates';
import './TemplatePicker.css';

export interface TemplatePickerProps {
  /** Whether the picker is open */
  isOpen: boolean;
  /** Called when the picker should close */
  onClose: () => void;
  /** Called when a template is selected */
  onSelect: (template: Template) => void;
  /** Optional filter to only show templates for specific type */
  targetTypeId?: string;
  /** Optional title override */
  title?: string;
}

export function TemplatePicker({
  isOpen,
  onClose,
  onSelect,
  targetTypeId,
  title = 'Create from Template',
}: TemplatePickerProps) {
  const { templates, getForType } = useTemplates();
  const typeRegistry = useTypeRegistry();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | null>(targetTypeId ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter templates based on query and type filter
  const filteredTemplates = useMemo(() => {
    let result = typeFilter ? getForType(typeFilter) : templates;

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return result;
  }, [templates, getForType, typeFilter, query]);

  // Get unique target types for filter dropdown
  const availableTypes = useMemo(() => {
    const typeIds = new Set(templates.map((t) => t.targetTypeId));
    return Array.from(typeIds)
      .map((id) => {
        const typeDef = typeRegistry.get(id);
        return typeDef ? { id, name: typeDef.name, icon: typeDef.icon } : null;
      })
      .filter((t): t is { id: string; name: string; icon: string } => t !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, typeRegistry]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTypeFilter(targetTypeId ?? null);
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, targetTypeId]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTemplates.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedItem = listRef.current.querySelector('.template-picker__item--selected');
    selectedItem?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredTemplates.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTemplates[selectedIndex]) {
            onSelect(filteredTemplates[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredTemplates, selectedIndex, onSelect, onClose]
  );

  // Global escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle template selection
  const handleSelectTemplate = useCallback(
    (template: Template) => {
      onSelect(template);
    },
    [onSelect]
  );

  // Get type display info
  const getTypeInfo = useCallback(
    (typeId: string) => {
      const typeDef = typeRegistry.get(typeId);
      return typeDef ? { name: typeDef.name, icon: typeDef.icon } : { name: typeId, icon: '?' };
    },
    [typeRegistry]
  );

  if (!isOpen) return null;

  const content = (
    <div className="template-picker__backdrop" onClick={handleBackdropClick}>
      <div
        className="template-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="template-picker__header">
          <h2 id="template-picker-title" className="template-picker__title">
            {title}
          </h2>
          <button
            type="button"
            className="template-picker__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Search and filter */}
        <div className="template-picker__controls">
          <input
            ref={inputRef}
            type="text"
            className="template-picker__search"
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!targetTypeId && availableTypes.length > 1 && (
            <select
              className="template-picker__filter"
              value={typeFilter ?? ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
            >
              <option value="">All Types</option>
              {availableTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Template list */}
        <div className="template-picker__list" ref={listRef} role="listbox">
          {filteredTemplates.length === 0 ? (
            <div className="template-picker__empty">
              {templates.length === 0
                ? 'No templates yet. Create one to get started.'
                : 'No templates match your search.'}
            </div>
          ) : (
            filteredTemplates.map((template, index) => {
              const typeInfo = getTypeInfo(template.targetTypeId);
              return (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`template-picker__item ${
                    index === selectedIndex ? 'template-picker__item--selected' : ''
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="template-picker__item-header">
                    <span className="template-picker__item-name">{template.name}</span>
                    {template.isDailyNoteTemplate && (
                      <span className="template-picker__item-badge" title="Daily note template">
                        Daily
                      </span>
                    )}
                  </div>
                  <div className="template-picker__item-meta">
                    <span className="template-picker__item-type">
                      Creates: {typeInfo.icon} {typeInfo.name}
                    </span>
                  </div>
                  {template.description && (
                    <div className="template-picker__item-description">{template.description}</div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="template-picker__footer">
          <span className="template-picker__hint">
            <kbd>&uarr;</kbd>
            <kbd>&darr;</kbd> Navigate
          </span>
          <span className="template-picker__hint">
            <kbd>Enter</kbd> Select
          </span>
          <span className="template-picker__hint">
            <kbd>Esc</kbd> Cancel
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
