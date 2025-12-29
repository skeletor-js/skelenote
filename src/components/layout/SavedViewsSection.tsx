/**
 * SavedViewsSection - Collapsible section displaying saved views in the sidebar
 */

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import './SavedViewsSection.css';
import { useSidebar } from '@/contexts';
import { useSavedViews, useConfirmDialog } from '@/hooks';
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
  /** Callback when edit is requested */
  onEditView?: (view: SavedView) => void;
  /** ID of the currently active view (for highlighting) */
  activeViewId?: string | null;
}

export function SavedViewsSection({
  onViewSelect,
  onEditView,
  activeViewId,
}: SavedViewsSectionProps) {
  const { isSectionCollapsed, toggleSection } = useSidebar();
  const { views, deleteView } = useSavedViews();
  const { confirm } = useConfirmDialog();

  const [contextMenu, setContextMenu] = useState<{
    view: SavedView;
    position: { x: number; y: number };
  } | null>(null);

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

  const handleEdit = useCallback(() => {
    if (contextMenu && onEditView) {
      onEditView(contextMenu.view);
    }
    setContextMenu(null);
  }, [contextMenu, onEditView]);

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

  // Don't render if no saved views
  if (views.length === 0) {
    return null;
  }

  return (
    <div className="saved-views-section">
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
        <span className="saved-views-section__count">{views.length}</span>
      </button>

      {!isCollapsed && (
        <div className="saved-views-section__content" role="listbox" aria-label="Saved views">
          {views.map((view) => (
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
          ))}
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
    </div>
  );
}
