/**
 * RelatedObjectsSection - Shows objects that reference this Project, Area, or Tag
 * Groups objects by type (Tasks, Notes, Meetings, etc.) in collapsible sections
 */

import { useMemo } from 'react';
import { Stack, Text, Box } from '@mantine/core';
import { useObjects, useTypeRegistry } from '@/contexts';
import { createRelationHelper } from '@/lib/loro';
import { RelatedTypeSection } from './RelatedTypeSection';
import type { SkelenoteObject } from '@/lib/types';

interface RelatedObjectsSectionProps {
  /** The object ID to find related objects for */
  objectId: string;
  /** The type of the current object (project, area, or tag) */
  objectTypeId: 'project' | 'area' | 'tag';
}

// Priority order for type sections (most relevant first)
const TYPE_PRIORITY: Record<string, number> = {
  task: 1,
  note: 2,
  meeting: 3,
  link: 4,
  person: 5,
  project: 6, // For areas showing projects
};

export function RelatedObjectsSection({
  objectId,
  objectTypeId,
}: RelatedObjectsSectionProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();

  // Get all objects that reference this one
  const relatedObjects = useMemo(() => {
    if (!store) return [];

    const relationHelper = createRelationHelper(store, typeRegistry);
    const backlinkedObjects = relationHelper.getBacklinkedObjects(objectId);

    // Filter out the object itself
    return backlinkedObjects.filter((obj) => obj.id !== objectId);
  }, [store, typeRegistry, objectId]);

  // Group objects by type and sort by updatedAt within each group
  const groupedByType = useMemo(() => {
    const groups = new Map<string, SkelenoteObject[]>();

    for (const obj of relatedObjects) {
      const typeId = obj.typeId;
      const existing = groups.get(typeId) ?? [];
      existing.push(obj);
      groups.set(typeId, existing);
    }

    // Sort objects within each group by updatedAt (most recent first)
    for (const [typeId, objects] of groups) {
      groups.set(
        typeId,
        objects.sort((a, b) => b.updatedAt - a.updatedAt)
      );
    }

    // Convert to array and sort by priority
    return Array.from(groups.entries())
      .sort((a, b) => {
        const priorityA = TYPE_PRIORITY[a[0]] ?? 99;
        const priorityB = TYPE_PRIORITY[b[0]] ?? 99;
        return priorityA - priorityB;
      });
  }, [relatedObjects]);

  // Get section label based on object type
  const getSectionLabel = (): string => {
    switch (objectTypeId) {
      case 'project':
        return 'In This Project';
      case 'area':
        return 'In This Area';
      case 'tag':
        return 'Tagged With This';
      default:
        return 'Related';
    }
  };

  // Don't render if no related objects
  if (groupedByType.length === 0) {
    return null;
  }

  const totalCount = relatedObjects.length;

  return (
    <Box component="section">
      <Text size="xs" c="dimmed" fw={500} tt="uppercase" pb="xs">
        {getSectionLabel()} ({totalCount})
      </Text>
      <Stack gap="xs">
        {groupedByType.map(([typeId, objects]) => (
          <RelatedTypeSection
            key={typeId}
            typeId={typeId}
            objects={objects}
            defaultExpanded={typeId === 'task'} // Expand tasks by default
          />
        ))}
      </Stack>
    </Box>
  );
}
