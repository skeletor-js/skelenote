/**
 * TemplateEditor - Modal for creating and editing templates
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTypeRegistry } from '@/contexts';
import { useTemplates } from '@/hooks';
import type { Template, CreateTemplateInput } from '@/lib/templates';
import { PLACEHOLDERS } from '@/lib/templates';
import { BuiltInTypeIds } from '@/lib/types';
import './TemplateEditor.css';

interface TemplateEditorProps {
  /** Existing template to edit (null for create mode) */
  template?: Template | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback after successful save */
  onSave?: (template: Template) => void;
}

export function TemplateEditor({ template, isOpen, onClose, onSave }: TemplateEditorProps) {
  const typeRegistry = useTypeRegistry();
  const { create, update } = useTemplates();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!template;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTypeId, setTargetTypeId] = useState<string>(BuiltInTypeIds.NOTE);
  const [isDailyNoteTemplate, setIsDailyNoteTemplate] = useState(false);
  const [content, setContent] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  // Get available types (exclude template type itself)
  const availableTypes = useMemo(() => {
    return typeRegistry.getAll().filter((t) => t.id !== BuiltInTypeIds.TEMPLATE);
  }, [typeRegistry]);

  // Initialize form when template changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name);
        setDescription(template.description ?? '');
        setTargetTypeId(template.targetTypeId);
        setIsDailyNoteTemplate(template.isDailyNoteTemplate);
        // Content would need to be loaded from the store
        setContent('');
      } else {
        setName('');
        setDescription('');
        setTargetTypeId(BuiltInTypeIds.NOTE);
        setIsDailyNoteTemplate(false);
        setContent('');
      }
    }
  }, [template, isOpen]);

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

  // Insert placeholder at cursor position
  const insertPlaceholder = useCallback((placeholder: string) => {
    setContent((prev) => prev + placeholder);
    setShowPlaceholders(false);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    if (isEditMode && template) {
      const updated = update(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetTypeId,
        isDailyNoteTemplate,
      });
      if (updated) {
        onSave?.(updated);
        onClose();
      }
    } else {
      const input: CreateTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        targetTypeId,
        isDailyNoteTemplate,
        content: content.trim() || undefined,
      };
      const created = create(input);
      if (created) {
        onSave?.(created);
        onClose();
      }
    }
  }, [name, description, targetTypeId, isDailyNoteTemplate, content, isEditMode, template, create, update, onSave, onClose]);

  // Handle form submission via Enter
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
        e.preventDefault();
        handleSave();
      }
    },
    [name, handleSave]
  );

  if (!isOpen) return null;

  const selectedType = typeRegistry.get(targetTypeId);

  return createPortal(
    <div className="template-editor__overlay" onClick={onClose}>
      <div
        className="template-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="template-editor__header">
          <h2 id="template-editor-title" className="template-editor__title">
            {isEditMode ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            className="template-editor__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        <div className="template-editor__content">
          {/* Template Name */}
          <div className="template-editor__field">
            <label className="template-editor__label" htmlFor="template-name">
              Template Name
            </label>
            <input
              ref={nameInputRef}
              id="template-name"
              type="text"
              className="template-editor__input"
              placeholder="e.g., Meeting Notes, Daily Journal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          {/* Target Type */}
          <div className="template-editor__field">
            <label className="template-editor__label" htmlFor="template-type">
              Creates
            </label>
            <select
              id="template-type"
              className="template-editor__select"
              value={targetTypeId}
              onChange={(e) => setTargetTypeId(e.target.value)}
            >
              {availableTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
            <p className="template-editor__hint-text">
              Objects created from this template will be {selectedType?.name ?? 'this type'}
            </p>
          </div>

          {/* Description */}
          <div className="template-editor__field">
            <label className="template-editor__label" htmlFor="template-description">
              Description <span className="template-editor__optional">(optional)</span>
            </label>
            <input
              id="template-description"
              type="text"
              className="template-editor__input"
              placeholder="Brief description of what this template is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Daily Note Template */}
          <div className="template-editor__field template-editor__field--checkbox">
            <label className="template-editor__checkbox-label">
              <input
                type="checkbox"
                className="template-editor__checkbox"
                checked={isDailyNoteTemplate}
                onChange={(e) => setIsDailyNoteTemplate(e.target.checked)}
              />
              <span className="template-editor__checkbox-text">
                Use as Daily Note Template
              </span>
            </label>
            <p className="template-editor__hint-text">
              Template content will auto-apply when new daily notes are created
            </p>
          </div>

          {/* Template Content */}
          {!isEditMode && (
            <div className="template-editor__field">
              <div className="template-editor__label-row">
                <label className="template-editor__label" htmlFor="template-content">
                  Template Content <span className="template-editor__optional">(optional)</span>
                </label>
                <div className="template-editor__placeholder-menu">
                  <button
                    type="button"
                    className="template-editor__placeholder-btn"
                    onClick={() => setShowPlaceholders(!showPlaceholders)}
                  >
                    Insert Placeholder
                  </button>
                  {showPlaceholders && (
                    <div className="template-editor__placeholder-dropdown">
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p.type}
                          type="button"
                          className="template-editor__placeholder-option"
                          onClick={() => insertPlaceholder(p.label)}
                          title={`Example: ${p.example}`}
                        >
                          <span className="template-editor__placeholder-label">{p.label}</span>
                          <span className="template-editor__placeholder-example">{p.example}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                id="template-content"
                className="template-editor__textarea"
                placeholder="Enter template content with placeholders like {{date}}, {{title}}..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
              <div className="template-editor__placeholder-help">
                <p className="template-editor__hint-text template-editor__hint-text--title">
                  Available placeholders:
                </p>
                <div className="template-editor__placeholder-grid">
                  {PLACEHOLDERS.map((p) => (
                    <div key={p.type} className="template-editor__placeholder-chip">
                      <code className="template-editor__placeholder-code">{p.label}</code>
                      <span className="template-editor__placeholder-arrow"></span>
                      <span className="template-editor__placeholder-result">{p.example}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isEditMode && (
            <p className="template-editor__note">
              To edit template content, open the template object and edit it directly.
            </p>
          )}
        </div>

        <footer className="template-editor__footer">
          <button
            type="button"
            className="template-editor__btn template-editor__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="template-editor__btn template-editor__btn--primary"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isEditMode ? 'Save Changes' : 'Create Template'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
