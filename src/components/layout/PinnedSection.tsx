/**
 * PinnedSection - Collapsible section displaying pinned objects with drag-and-drop reordering
 */

import { useState, useCallback } from 'react';
import './PinnedSection.css';
import { useSidebar } from '@/contexts';
import { usePinnedObjects } from '@/hooks';
import { PinnedItem } from './PinnedItem';

export function PinnedSection() {
  const { isSectionCollapsed, toggleSection } = useSidebar();
  const { pinnedObjects, reorder } = usePinnedObjects();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isCollapsed = isSectionCollapsed('pinned');

  const handleToggle = useCallback(() => {
    toggleSection('pinned');
  }, [toggleSection]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      // Reorder the array
      const newOrder = [...pinnedObjects];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dragOverIndex, 0, removed);

      // Update the order
      reorder(newOrder.map((obj) => obj.id));
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, pinnedObjects, reorder]);

  // Handle drop on the container (for dropping at the end)
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleContainerDrop = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Don't render if no pinned objects
  if (pinnedObjects.length === 0) {
    return null;
  }

  return (
    <div className="pinned-section">
      <button
        className="pinned-section__header"
        onClick={handleToggle}
        aria-expanded={!isCollapsed}
      >
        <span
          className={`pinned-section__chevron ${isCollapsed ? 'pinned-section__chevron--collapsed' : ''}`}
        >
          &#9656;
        </span>
        <span className="pinned-section__title">Pinned</span>
        <span className="pinned-section__count">{pinnedObjects.length}</span>
      </button>

      {!isCollapsed && (
        <div
          className="pinned-section__content"
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
          role="listbox"
          aria-label="Pinned items"
        >
          {pinnedObjects.map((obj, index) => (
            <PinnedItem
              key={obj.id}
              object={obj}
              index={index}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index && draggedIndex !== index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
