/**
 * SavedViewEditor - Modal for creating and editing saved views
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SavedViewEditor.css';
import { useTypeRegistry } from '@/contexts';
import { useSavedViews } from '@/hooks';
import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from '@/lib/types';
import type { FilterCondition, FilterOperator, SortConfig } from '@/lib/loro';

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
  { value: 'isNull', label: 'is empty' },
  { value: 'isNotNull', label: 'is not empty' },
];

const COMMON_ICONS = ['📋', '📁', '⭐', '🔖', '📝', '✅', '🎯', '📌', '🔍', '📊', '🗂️', '💡'];

const BUILT_IN_FIELDS = [
  { id: 'createdAt', name: 'Created Date', type: 'date' },
  { id: 'updatedAt', name: 'Updated Date', type: 'date' },
  { id: 'inboxed', name: 'In Inbox', type: 'boolean' },
];

interface SavedViewEditorProps {
  /** Existing view to edit (null for create mode) */
  view?: SavedView | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback after successful save */
  onSave?: (view: SavedView) => void;
}

export function SavedViewEditor({ view, isOpen, onClose, onSave }: SavedViewEditorProps) {
  const typeRegistry = useTypeRegistry();
  const { createView, updateView } = useSavedViews();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!view;

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Get available types
  const availableTypes = typeRegistry.getAll();

  // Get fields for the selected type
  const getFieldsForType = useCallback(() => {
    const fields = [...BUILT_IN_FIELDS];

    if (typeFilter) {
      const typeDef = typeRegistry.get(typeFilter);
      if (typeDef) {
        typeDef.schema.forEach((prop) => {
          fields.push({
            id: prop.id,
            name: prop.name,
            type: prop.type,
          });
        });
      }
    } else {
      // When no type filter, show common fields from all types
      availableTypes.forEach((typeDef) => {
        typeDef.schema.forEach((prop) => {
          if (!fields.find((f) => f.id === prop.id)) {
            fields.push({
              id: prop.id,
              name: prop.name,
              type: prop.type,
            });
          }
        });
      });
    }

    return fields;
  }, [typeFilter, typeRegistry, availableTypes]);

  // Initialize form when view changes
  useEffect(() => {
    if (view) {
      setName(view.name);
      setIcon(view.icon || '📋');
      setTypeFilter(view.typeFilter || null);
      setFilters(view.filters || []);
      setSortField(view.sort?.field || '');
      setSortDirection(view.sort?.direction || 'desc');
    } else {
      setName('');
      setIcon('📋');
      setTypeFilter(null);
      setFilters([]);
      setSortField('');
      setSortDirection('desc');
    }
  }, [view, isOpen]);

  // Focus name input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Add a new filter
  const handleAddFilter = useCallback(() => {
    const fields = getFieldsForType();
    const defaultField = fields[0]?.id || 'title';
    setFilters((prev) => [
      ...prev,
      { field: defaultField, operator: 'eq' as FilterOperator, value: '' },
    ]);
  }, [getFieldsForType]);

  // Update a filter
  const handleUpdateFilter = useCallback(
    (index: number, updates: Partial<FilterCondition>) => {
      setFilters((prev) =>
        prev.map((filter, i) => (i === index ? { ...filter, ...updates } : filter))
      );
    },
    []
  );

  // Remove a filter
  const handleRemoveFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const sort: SortConfig | undefined =
      sortField ? { field: sortField, direction: sortDirection } : undefined;

    if (isEditMode && view) {
      const updates: UpdateSavedViewInput = {
        name: name.trim(),
        icon,
        typeFilter,
        filters,
        sort,
      };
      const updated = updateView(view.id, updates);
      if (updated) {
        onSave?.(updated);
        onClose();
      }
    } else {
      const input: CreateSavedViewInput = {
        name: name.trim(),
        icon,
        typeFilter,
        filters,
        sort,
      };
      const created = createView(input);
      if (created) {
        onSave?.(created);
        onClose();
      }
    }
  }, [
    name,
    icon,
    typeFilter,
    filters,
    sortField,
    sortDirection,
    isEditMode,
    view,
    createView,
    updateView,
    onSave,
    onClose,
  ]);

  if (!isOpen) return null;

  const fields = getFieldsForType();

  return createPortal(
    <div className="saved-view-editor__overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="saved-view-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-view-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="saved-view-editor__header">
          <h2 id="saved-view-editor-title" className="saved-view-editor__title">
            {isEditMode ? 'Edit View' : 'Create Saved View'}
          </h2>
          <button
            className="saved-view-editor__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="saved-view-editor__content">
          {/* Name and Icon */}
          <div className="saved-view-editor__row">
            <div className="saved-view-editor__icon-picker">
              <button
                type="button"
                className="saved-view-editor__icon-btn"
                onClick={() => setShowIconPicker(!showIconPicker)}
                aria-label="Choose icon"
              >
                {icon}
              </button>
              {showIconPicker && (
                <div className="saved-view-editor__icon-dropdown">
                  {COMMON_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="saved-view-editor__icon-option"
                      onClick={() => {
                        setIcon(emoji);
                        setShowIconPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={nameInputRef}
              type="text"
              className="saved-view-editor__name-input"
              placeholder="View name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div className="saved-view-editor__field">
            <label className="saved-view-editor__label">Filter by Type</label>
            <select
              className="saved-view-editor__select"
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
            >
              <option value="">All Types</option>
              {availableTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filters */}
          <div className="saved-view-editor__field">
            <label className="saved-view-editor__label">Filters</label>
            <div className="saved-view-editor__filters">
              {filters.map((filter, index) => (
                <div key={index} className="saved-view-editor__filter-row">
                  <select
                    className="saved-view-editor__filter-field"
                    value={filter.field}
                    onChange={(e) =>
                      handleUpdateFilter(index, { field: e.target.value })
                    }
                  >
                    {fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="saved-view-editor__filter-operator"
                    value={filter.operator}
                    onChange={(e) =>
                      handleUpdateFilter(index, {
                        operator: e.target.value as FilterOperator,
                      })
                    }
                  >
                    {FILTER_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  {filter.operator !== 'isNull' &&
                    filter.operator !== 'isNotNull' && (
                      <input
                        type="text"
                        className="saved-view-editor__filter-value"
                        placeholder="Value"
                        value={String(filter.value ?? '')}
                        onChange={(e) =>
                          handleUpdateFilter(index, { value: e.target.value })
                        }
                      />
                    )}
                  <button
                    type="button"
                    className="saved-view-editor__filter-remove"
                    onClick={() => handleRemoveFilter(index)}
                    aria-label="Remove filter"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="saved-view-editor__add-filter"
                onClick={handleAddFilter}
              >
                + Add Filter
              </button>
            </div>
          </div>

          {/* Sort */}
          <div className="saved-view-editor__field">
            <label className="saved-view-editor__label">Sort By</label>
            <div className="saved-view-editor__sort-row">
              <select
                className="saved-view-editor__sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
              >
                <option value="">No sorting</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
              {sortField && (
                <select
                  className="saved-view-editor__sort-direction"
                  value={sortDirection}
                  onChange={(e) =>
                    setSortDirection(e.target.value as 'asc' | 'desc')
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              )}
            </div>
          </div>
        </div>

        <footer className="saved-view-editor__footer">
          <button
            type="button"
            className="saved-view-editor__btn saved-view-editor__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="saved-view-editor__btn saved-view-editor__btn--primary"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isEditMode ? 'Save Changes' : 'Create View'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
