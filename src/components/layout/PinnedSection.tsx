/**
 * PinnedSection - Collapsible section displaying pinned objects with drag-and-drop reordering
 */

import { useState, useCallback } from 'react';
import { NavLink, Badge, Box, Stack } from '@mantine/core';
import { ChevronRight } from 'lucide-react';
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
    <Box mb="xs">
      <NavLink
        label="Pinned"
        leftSection={
          <ChevronRight
            size={14}
            style={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 150ms ease',
            }}
          />
        }
        rightSection={
          <Badge size="xs" variant="filled" color="gray" circle>
            {pinnedObjects.length}
          </Badge>
        }
        onClick={handleToggle}
        opened={!isCollapsed}
        disableRightSectionRotation
        variant="subtle"
        styles={{
          label: {
            fontWeight: 600,
            fontSize: 'var(--mantine-font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--mantine-color-dimmed)',
          },
        }}
      >
        <Stack
          gap={0}
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
        </Stack>
      </NavLink>
    </Box>
  );
}
