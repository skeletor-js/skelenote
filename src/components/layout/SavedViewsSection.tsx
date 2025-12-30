/**
 * SavedViewsSection - Collapsible section displaying saved views in the sidebar
 */

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import './SavedViewsSection.css';
import { useSidebar } from '@/contexts';
import { useSavedViews, useConfirmDialog } from '@/hooks';
import { SavedViewEditor } from '@/components/views';
import { ConfirmDialog } from '@/components/ui';
import type { SavedView } from '@/lib/types';

interface SavedViewsContextMenuProps {
  view: SavedView;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SavedViewsContextMenu({
  view: _view,
  position,
  onClose,
  onEdit,
  onDelete,
}: SavedViewsContextMenuProps) {
  return createPortal(
    <div className="saved-views-context-menu__overlay" onClick={onClose}>
      <div
        className="saved-views-context-menu"
        style={{ top: position.y, left: position.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="saved-views-context-menu__item" onClick={onEdit}>
          Edit View
        </button>
        <button
          className="saved-views-context-menu__item saved-views-context-menu__item--danger"
          onClick={onDelete}
        >
          Delete View
        </button>
      </div>
    </div>,
    document.body
  );
}

interface SavedViewsSectionProps {
  /** Callback when a view is selected */
  onViewSelect?: (view: SavedView) => void;
  /** ID of the currently active view (for highlighting) */
  activeViewId?: string | null;
}

export function SavedViewsSection({
  onViewSelect,
  activeViewId,
}: SavedViewsSectionProps) {
  const { isSectionCollapsed, toggleSection } = useSidebar();
  const { views, deleteView } = useSavedViews();
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  const [contextMenu, setContextMenu] = useState<{
    view: SavedView;
    position: { x: number; y: number };
  } | null>(null);

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);

  const isCollapsed = isSectionCollapsed('saved-views');

  const handleToggle = useCallback(() => {
    toggleSection('saved-views');
  }, [toggleSection]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, view: SavedView) => {
      e.preventDefault();
      setContextMenu({
        view,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Open editor for creating new view
  const handleCreateView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingView(null);
    setIsEditorOpen(true);
  }, []);

  // Open editor for editing existing view
  const handleEdit = useCallback(() => {
    if (contextMenu) {
      setEditingView(contextMenu.view);
      setIsEditorOpen(true);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setEditingView(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;

    const viewToDelete = contextMenu.view;
    setContextMenu(null);

    const confirmed = await confirm({
      title: 'Delete View',
      message: `Are you sure you want to delete "${viewToDelete.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      deleteView(viewToDelete.id);
    }
  }, [contextMenu, confirm, deleteView]);

  const handleViewClick = useCallback(
    (view: SavedView) => {
      onViewSelect?.(view);
    },
    [onViewSelect]
  );

  return (
    <div className="saved-views-section">
      <div className="saved-views-section__header-row">
        <button
          className="saved-views-section__header"
          onClick={handleToggle}
          aria-expanded={!isCollapsed}
        >
          <span
            className={`saved-views-section__chevron ${isCollapsed ? 'saved-views-section__chevron--collapsed' : ''}`}
          >
            &#9656;
          </span>
          <span className="saved-views-section__title">Saved Views</span>
          {views.length > 0 && (
            <span className="saved-views-section__count">{views.length}</span>
          )}
        </button>
        <button
          className="saved-views-section__add-btn"
          onClick={handleCreateView}
          aria-label="Create new saved view"
          title="Create new saved view"
        >
          +
        </button>
      </div>

      {!isCollapsed && (
        <div className="saved-views-section__content" role="listbox" aria-label="Saved views">
          {views.length === 0 ? (
            <div className="saved-views-section__empty">
              No saved views yet
            </div>
          ) : (
            views.map((view) => (
              <button
                key={view.id}
                className={`saved-views-section__item ${activeViewId === view.id ? 'saved-views-section__item--active' : ''}`}
                onClick={() => handleViewClick(view)}
                onContextMenu={(e) => handleContextMenu(e, view)}
                role="option"
                aria-selected={activeViewId === view.id}
              >
                <span className="saved-views-section__item-icon">
                  {view.icon || '📋'}
                </span>
                <span className="saved-views-section__item-name">{view.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {contextMenu && (
        <SavedViewsContextMenu
          view={contextMenu.view}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <SavedViewEditor
        view={editingView}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
      />

      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
