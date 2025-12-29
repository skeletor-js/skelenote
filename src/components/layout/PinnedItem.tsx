/**
 * PinnedItem - A draggable pinned object in the sidebar
 */

import { useCallback } from 'react';
import './PinnedItem.css';
import { useSidebar, useTypeRegistry, useNavigation } from '@/contexts';
import { useContextMenu, usePinnedObjects } from '@/hooks';
import { ContextMenu, type ContextMenuItem } from '@/components/ui';
import type { SkelenoteObject } from '@/lib/types';

interface PinnedItemProps {
  object: SkelenoteObject;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

export function PinnedItem({
  object,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
}: PinnedItemProps) {
  const { selectedItem, setSelectedItem } = useSidebar();
  const { navigateToObject } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { unpin } = usePinnedObjects();
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();

  // Get type info for icon
  const typeDef = typeRegistry.get(object.typeId);
  const icon = typeDef?.icon ?? '📄';

  // Get display title
  const title =
    (object.properties.title as string) ||
    (object.properties.name as string) ||
    'Untitled';

  const itemId = `pinned-${object.id}`;
  const isSelected = selectedItem === itemId;

  const handleClick = useCallback(() => {
    setSelectedItem(itemId);
    navigateToObject(object.id);
  }, [setSelectedItem, itemId, navigateToObject, object.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', object.id);
      onDragStart(index);
    },
    [onDragStart, index, object.id]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      onDragOver(index);
    },
    [onDragOver, index]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'unpin',
      label: 'Unpin from Sidebar',
      icon: '📌',
      onClick: () => unpin(object.id),
    },
  ];

  // Build class names
  const classNames = ['pinned-item'];
  if (isSelected) classNames.push('pinned-item--selected');
  if (isDragging) classNames.push('pinned-item--dragging');
  if (isDragOver) classNames.push('pinned-item--drag-over');

  return (
    <>
      <div
        className={classNames.join(' ')}
        draggable
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={openContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        role="button"
        tabIndex={0}
        aria-current={isSelected ? 'page' : undefined}
        aria-grabbed={isDragging}
      >
        <span className="pinned-item__drag-handle" aria-hidden="true">
          ⠿
        </span>
        <span className="pinned-item__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="pinned-item__label">{title}</span>
      </div>

      <ContextMenu
        items={contextMenuItems}
        position={position}
        isOpen={isOpen}
        onClose={closeContextMenu}
      />
    </>
  );
}
