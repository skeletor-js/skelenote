/**
 * Template Settings
 *
 * Settings panel for managing templates - view, edit, delete, and set daily note template.
 */

import { useState, useCallback } from 'react';
import { useTemplates } from '@/hooks';
import { useTypeRegistry, useNavigation, useToast } from '@/contexts';
import { TemplateEditor } from '@/components/templates';
import type { Template } from '@/lib/templates';
import './TemplateSettings.css';

export function TemplateSettings() {
  const { templates, remove, setDailyNoteTemplate, dailyNoteTemplate } = useTemplates();
  const typeRegistry = useTypeRegistry();
  const { navigateToObject } = useNavigation();
  const { addToast } = useToast();

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleEdit = useCallback((template: Template) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  }, []);

  const handleDelete = useCallback(
    (template: Template) => {
      if (confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
        const success = remove(template.id);
        if (success) {
          addToast({
            type: 'success',
            message: `Deleted template "${template.name}"`,
          });
        } else {
          addToast({
            type: 'error',
            message: 'Failed to delete template',
          });
        }
      }
    },
    [remove, addToast]
  );

  const handleSetDailyTemplate = useCallback(
    (templateId: string | null) => {
      setDailyNoteTemplate(templateId);
      if (templateId) {
        const template = templates.find((t) => t.id === templateId);
        addToast({
          type: 'success',
          message: `Set "${template?.name}" as daily note template`,
        });
      } else {
        addToast({
          type: 'info',
          message: 'Cleared daily note template',
        });
      }
    },
    [setDailyNoteTemplate, templates, addToast]
  );

  const handleViewContent = useCallback(
    (template: Template) => {
      navigateToObject(template.id);
    },
    [navigateToObject]
  );

  const getTypeName = (typeId: string) => {
    const typeDef = typeRegistry.get(typeId);
    return typeDef ? `${typeDef.icon} ${typeDef.name}` : typeId;
  };

  return (
    <section className="template-settings">
      <h2 className="template-settings__title">Templates</h2>

      <div className="template-settings__section">
        <p className="template-settings__description">
          Templates are reusable blueprints for creating objects with pre-filled content.
          Use placeholders like {'{{date}}'} for dynamic content.
        </p>

        {templates.length === 0 ? (
          <div className="template-settings__empty">
            <p>No templates yet.</p>
            <p className="template-settings__empty-hint">
              Create templates using <kbd>Cmd+Shift+T</kbd> or from the Command Palette.
            </p>
          </div>
        ) : (
          <div className="template-settings__list">
            {templates.map((template) => (
              <div key={template.id} className="template-settings__item">
                <div className="template-settings__item-main">
                  <div className="template-settings__item-header">
                    <span className="template-settings__item-name">{template.name}</span>
                    {template.isDailyNoteTemplate && (
                      <span className="template-settings__item-badge">Daily Note</span>
                    )}
                  </div>
                  <div className="template-settings__item-meta">
                    <span className="template-settings__item-type">
                      Creates: {getTypeName(template.targetTypeId)}
                    </span>
                    {template.description && (
                      <span className="template-settings__item-desc">
                        {template.description}
                      </span>
                    )}
                  </div>
                </div>
                <div className="template-settings__item-actions">
                  <button
                    className="template-settings__action-btn"
                    onClick={() => handleViewContent(template)}
                    title="View/Edit Content"
                  >
                    View
                  </button>
                  <button
                    className="template-settings__action-btn"
                    onClick={() => handleEdit(template)}
                    title="Edit Template Settings"
                  >
                    Edit
                  </button>
                  <button
                    className="template-settings__action-btn template-settings__action-btn--danger"
                    onClick={() => handleDelete(template)}
                    title="Delete Template"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {templates.length > 0 && (
        <>
          <div className="template-settings__divider" />

          <div className="template-settings__section">
            <label className="template-settings__label">Daily Note Template</label>
            <p className="template-settings__help" style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>
              Automatically apply this template when creating new daily notes.
            </p>
            <select
              className="template-settings__select"
              value={dailyNoteTemplate?.id ?? ''}
              onChange={(e) => handleSetDailyTemplate(e.target.value || null)}
            >
              <option value="">None (empty daily notes)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <TemplateEditor
        template={editingTemplate}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
      />
    </section>
  );
}
