/**
 * RelatedTypeSection - Collapsible section for a single object type
 * Used in RelatedObjectsSection to group related objects by type
 */

import { useState, useCallback } from 'react';
import { Collapse, Stack, Group, Text, Box } from '@mantine/core';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui';
import { TaskRow } from '@/components/views/TaskRow';
import { ObjectRow } from './ObjectRow';
import type { SkelenoteObject } from '@/lib/types';
import { getIconFromEmoji } from '@/lib/icons';
import type { IconName } from '@/lib/icons';

interface RelatedTypeSectionProps {
  /** The type ID of objects in this section */
  typeId: string;
  /** The objects to display */
  objects: SkelenoteObject[];
  /** Whether the section should be expanded by default */
  defaultExpanded?: boolean;
}

export function RelatedTypeSection({
  typeId,
  objects,
  defaultExpanded = true,
}: RelatedTypeSectionProps) {
  const { navigateToObject, openInSplit } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const typeDef = typeRegistry.get(typeId);
  const typeName = typeDef?.name ?? typeId;
  const count = objects.length;

  // Get icon for the type
  const getTypeIcon = (): IconName => {
    if (!typeDef?.icon) return 'file';
    if (typeDef.icon.length <= 2) {
      return getIconFromEmoji(typeDef.icon);
    }
    return typeDef.icon as IconName;
  };

  // Handle object click - navigate to detail
  const handleObjectClick = useCallback(
    (objectId: string) => {
      navigateToObject(objectId);
    },
    [navigateToObject]
  );

  // Handle open in split pane
  const handleOpenInSplit = useCallback(
    (objectId: string) => {
      openInSplit(objectId);
    },
    [openInSplit]
  );

  // Handle task toggle complete
  const handleToggleComplete = useCallback(
    (taskId: string) => {
      if (!store) return;
      const task = store.get(taskId);
      if (!task) return;

      const currentStatus = task.properties.status;
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      store.setProperty(taskId, 'status', newStatus);
      refreshData();
    },
    [store, refreshData]
  );

  // Handle object delete
  const handleDelete = useCallback(
    (objectId: string) => {
      if (!store) return;
      store.delete(objectId);
      refreshData();
    },
    [store, refreshData]
  );

  // Don't render if no objects
  if (count === 0) return null;

  return (
    <Box component="section">
      <Group
        gap="xs"
        py="xs"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <Icon
          name="chevron-right"
          size={14}
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <Icon name={getTypeIcon()} size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
        <Text size="sm" c="dimmed">
          {typeName}{count > 0 && ` (${count})`}
        </Text>
      </Group>

      <Collapse in={isExpanded}>
        <Stack gap={0} pl="md">
          {objects.map((obj) =>
            typeId === 'task' ? (
              <TaskRow
                key={obj.id}
                task={obj}
                onToggleComplete={handleToggleComplete}
                onClick={() => handleObjectClick(obj.id)}
                onOpenInSplit={() => handleOpenInSplit(obj.id)}
                onDelete={handleDelete}
              />
            ) : (
              <ObjectRow
                key={obj.id}
                object={obj}
                onClick={() => handleObjectClick(obj.id)}
                onOpenInSplit={() => handleOpenInSplit(obj.id)}
                onDelete={handleDelete}
              />
            )
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
