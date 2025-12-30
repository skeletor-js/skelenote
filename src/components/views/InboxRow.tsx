/**
 * InboxRow component for inbox list view display
 * Shows: type icon, title/name, type label, created date, preview (first tag), process button
 */

import { useCallback } from 'react';
import type { SkelenoteObject } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils/date';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { Tag, ContextMenu, ConfirmDialog, type TagColor, type ContextMenuItem } from '@/components/ui';
import { useContextMenu, useConfirmDialog, usePinnedObjects } from '@/hooks';
import './InboxRow.css';

interface InboxRowProps {
  /** The inbox item object to display */
  item: SkelenoteObject;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback when process button is clicked */
  onProcess: (itemId: string) => void;
  /** Callback when item is deleted */
  onDelete: (itemId: string) => void;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Callback when selection checkbox is toggled */
  onSelectionChange?: (id: string, shiftKey: boolean) => void;
  /** Whether any item in the list is selected (enables "selecting mode") */
  isSelectingMode?: boolean;
}

export function InboxRow({
  item,
  onClick,
  onProcess,
  onDelete,
  isSelected = false,
  onSelectionChange,
  isSelectingMode = false,
}: InboxRowProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const { isPinned, pin, unpin } = usePinnedObjects();

  // Get type info
  const typeDef = typeRegistry.get(item.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? item.typeId;

  // Get title or name
  const title = (item.properties.title ?? item.properties.name ?? 'Untitled') as string;

  // Get first tag for preview
  const tagIds = item.properties.tags as string[] | null;
  const firstTag = tagIds?.[0] ? store?.get(tagIds[0]) : null;
  const tagInfo = firstTag
    ? {
        name: firstTag.properties.name as string,
        color: firstTag.properties.color as TagColor | undefined,
      }
    : null;

  // Handle selection checkbox click
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange?.(item.id, e.shiftKey);
    },
    [onSelectionChange, item.id]
  );

  // Handle keyboard on selection checkbox
  const handleCheckboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onSelectionChange?.(item.id, e.shiftKey);
      }
    },
    [onSelectionChange, item.id]
  );

  // Handle process button click without triggering row click
  const handleProcessClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onProcess(item.id);
    },
    [onProcess, item.id]
  );

  // Handle keyboard on process button
  const handleProcessKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onProcess(item.id);
      }
    },
    [onProcess, item.id]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: `Delete ${typeName}?`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      onDelete(item.id);
      addToast({
        type: 'success',
        message: `"${title}" deleted`,
      });
    }
  }, [confirm, typeName, title, item.id, onDelete, addToast]);

  // Handle pin/unpin
  const itemIsPinned = isPinned(item.id);
  const handleTogglePin = useCallback(() => {
    if (itemIsPinned) {
      unpin(item.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(item.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [itemIsPinned, pin, unpin, item.id, addToast]);

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'pin',
      label: itemIsPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
      icon: '📌',
      onClick: handleTogglePin,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      variant: 'danger',
      onClick: handleDelete,
    },
  ];

  // Build class names
  const classNames = ['inbox-row'];
  if (isSelected) classNames.push('inbox-row--selected');
  if (isSelectingMode) classNames.push('inbox-row--selecting-mode');

  return (
    <>
    <div
      className={classNames.join(' ')}
      onClick={onClick}
      onContextMenu={openContextMenu}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          onClick();
        }
      }}
    >
      {/* Selection checkbox */}
      {onSelectionChange && (
        <button
          type="button"
          className={`inbox-row__checkbox ${isSelected ? 'inbox-row__checkbox--checked' : ''}`}
          onClick={handleCheckboxClick}
          onKeyDown={handleCheckboxKeyDown}
          aria-label={`Select ${title}`}
          aria-pressed={isSelected}
        >
          {isSelected && <span className="inbox-row__check-icon">✓</span>}
        </button>
      )}

      {/* Type icon */}
      <span className="inbox-row__icon" title={typeName}>
        {icon}
      </span>

      {/* Title */}
      <span className="inbox-row__title">{title}</span>

      {/* Type label */}
      <span className="inbox-row__type">{typeName}</span>

      {/* Created date */}
      <span className="inbox-row__date">{formatRelativeDate(item.createdAt)}</span>

      {/* Preview - first tag */}
      {tagInfo && (
        <div className="inbox-row__preview">
          <Tag name={tagInfo.name} color={tagInfo.color} size="sm" />
        </div>
      )}

      {/* Process button */}
      <button
        className="inbox-row__process"
        onClick={handleProcessClick}
        onKeyDown={handleProcessKeyDown}
        aria-label="Mark as processed"
        title="Process"
      >
        Done
      </button>
    </div>

    {/* Context Menu */}
    <ContextMenu
      items={contextMenuItems}
      position={position}
      isOpen={isOpen}
      onClose={closeContextMenu}
    />

    {/* Confirm Dialog */}
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
    </>
  );
}
