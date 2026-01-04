/**
 * HistoricalObjectView - Read-only view of an object at a historical point in time
 *
 * Used in the split pane for side-by-side version comparison.
 * Shows historical content with diff highlighting against current version.
 */

import { useMemo, useCallback, useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Box,
  Button,
  ActionIcon,
  ScrollArea,
  Divider,
  Tooltip,
} from '@mantine/core';
import { Icon } from '@/components/ui';
import { useObjects, useTypeRegistry, useNavigation, useToast } from '@/contexts';
import type { ChangePoint } from '@/lib/loro/versions';
import { getIconFromEmoji } from '@/lib/icons';
import { ContentPreview } from './ContentPreview';
import { RestoreDialog } from './RestoreDialog';
import type { SkelenoteObject, PropertyDefinition } from '@/lib/types';
import type { ObjectStore } from '@/lib/loro';

/**
 * Get a display title for an object
 */
function getObjectTitle(obj: SkelenoteObject): string {
  const titleProps = ['title', 'name', 'url'];
  for (const prop of titleProps) {
    const value = obj.properties[prop];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return 'Untitled';
}

/**
 * Check if a string looks like a UUID
 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Get display name for an object by ID
 */
function getObjectDisplayName(store: ObjectStore | null, objectId: string): string | null {
  if (!store) return null;
  const obj = store.get(objectId);
  if (!obj) return null;

  const titleProps = ['title', 'name', 'url'];
  for (const prop of titleProps) {
    const value = obj.properties[prop];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Format a property value for display
 * Returns null for empty/null values (these will be filtered out)
 */
function formatPropertyValue(
  value: unknown,
  propDef?: PropertyDefinition,
  store?: ObjectStore | null
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    // Check if it looks like a timestamp (ms since epoch)
    if (value > 1000000000000 && value < 2000000000000) {
      return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return value.toLocaleString();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    // If it's a relation array, resolve each ID
    if (propDef?.type === 'relation' && store) {
      const names = value
        .map(id => typeof id === 'string' ? getObjectDisplayName(store, id) ?? id : String(id))
        .filter(Boolean);
      return names.join(', ');
    }
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const strValue = String(value).trim();
  if (!strValue) return null;

  // If it's a relation property or looks like a UUID, try to resolve it
  if ((propDef?.type === 'relation' || isUUID(strValue)) && store) {
    const displayName = getObjectDisplayName(store, strValue);
    if (displayName) return displayName;
  }

  return strValue;
}

export function HistoricalObjectView() {
  const { store, docStore, refreshData } = useObjects();
  const { splitPane, closeSplit, updateVersionComparison, returnToTimeMachine } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  // Restore dialog state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Get all change points for this object for version navigation
  const objectChangePoints = useMemo((): ChangePoint[] => {
    if (!splitPane.objectId) return [];
    const history = docStore.getVersionHistoryForObject(splitPane.objectId);
    return history.changePoints;
  }, [docStore, splitPane.objectId]);

  // Find current position in change points
  const currentVersionIndex = useMemo(() => {
    if (!splitPane.historicalTimestamp || objectChangePoints.length === 0) return -1;
    return objectChangePoints.findIndex(
      (cp) => cp.timestamp === splitPane.historicalTimestamp
    );
  }, [objectChangePoints, splitPane.historicalTimestamp]);

  // Version navigation handlers
  const canGoPrev = currentVersionIndex > 0;
  const canGoNext = currentVersionIndex < objectChangePoints.length - 1 && currentVersionIndex !== -1;

  const handlePrevVersion = useCallback(() => {
    if (!canGoPrev) return;
    const prevPoint = objectChangePoints[currentVersionIndex - 1];
    updateVersionComparison(prevPoint.frontier, prevPoint.timestamp);
  }, [canGoPrev, objectChangePoints, currentVersionIndex, updateVersionComparison]);

  const handleNextVersion = useCallback(() => {
    if (!canGoNext) return;
    const nextPoint = objectChangePoints[currentVersionIndex + 1];
    updateVersionComparison(nextPoint.frontier, nextPoint.timestamp);
  }, [canGoNext, objectChangePoints, currentVersionIndex, updateVersionComparison]);

  // Close handler - return to Time Machine if we came from there, otherwise just close
  const handleClose = useCallback(() => {
    if (splitPane.timeMachineContext) {
      returnToTimeMachine();
    } else {
      closeSplit();
    }
  }, [splitPane.timeMachineContext, returnToTimeMachine, closeSplit]);

  // Get the historical object from the frontier
  const historicalObject = useMemo((): SkelenoteObject | null => {
    if (!splitPane.historicalFrontier || !splitPane.objectId) return null;

    const objects = docStore.getObjectsAtVersion(splitPane.historicalFrontier);
    return (objects.find((obj) => obj.id === splitPane.objectId) as SkelenoteObject) ?? null;
  }, [docStore, splitPane.historicalFrontier, splitPane.objectId]);

  // Format the timestamp
  const formattedTimestamp = useMemo(() => {
    if (!splitPane.historicalTimestamp) return '';
    return new Date(splitPane.historicalTimestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [splitPane.historicalTimestamp]);

  // Handle restore
  const handleRestoreClick = useCallback(() => {
    setRestoreDialogOpen(true);
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (!splitPane.historicalFrontier || !splitPane.objectId) return;

    const success = docStore.restoreFromVersion(splitPane.historicalFrontier, {
      type: 'single',
      objectId: splitPane.objectId,
    });

    setRestoreDialogOpen(false);

    if (success) {
      refreshData();
      addToast({
        type: 'success',
        message: 'Object restored successfully!',
      });
      // Return to Time Machine if we came from there
      if (splitPane.timeMachineContext) {
        returnToTimeMachine();
      } else {
        closeSplit();
      }
    } else {
      addToast({
        type: 'error',
        message: 'Failed to restore. Check the console for details.',
      });
    }
  }, [splitPane.historicalFrontier, splitPane.objectId, splitPane.timeMachineContext, docStore, refreshData, addToast, returnToTimeMachine, closeSplit]);

  const handleRestoreCancel = useCallback(() => {
    setRestoreDialogOpen(false);
  }, []);

  // Get type definition - needed before early return for useMemo
  const typeDef = historicalObject ? typeRegistry.get(historicalObject.typeId) : null;

  // Get property definitions from type schema for proper labels, filtering out empty values
  // Must be called before early return to satisfy rules of hooks
  const visibleProperties = useMemo(() => {
    if (!historicalObject) return [];
    const properties: Array<{ id: string; label: string; value: string }> = [];

    if (!typeDef) {
      // If no type def, show all properties except content
      Object.entries(historicalObject.properties).forEach(([key, value]) => {
        if (key === 'content') return;
        const formatted = formatPropertyValue(value, undefined, store);
        if (formatted) {
          properties.push({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            value: formatted,
          });
        }
      });
    } else {
      // Use schema to get proper labels, skip hidden properties
      typeDef.schema.forEach((propDef) => {
        if (propDef.hidden) return;
        const formatted = formatPropertyValue(historicalObject.properties[propDef.id], propDef, store);
        if (formatted) {
          properties.push({
            id: propDef.id,
            label: propDef.name,
            value: formatted,
          });
        }
      });
    }

    return properties;
  }, [typeDef, historicalObject, store]);

  if (!historicalObject) {
    return (
      <Box p="lg" ta="center">
        <Text c="dimmed" mb="sm">Unable to load historical version</Text>
        <Button variant="subtle" onClick={handleClose}>Close</Button>
      </Box>
    );
  }

  const iconEmoji = typeDef?.icon ?? '📄';
  const iconName = getIconFromEmoji(iconEmoji);
  const typeName = typeDef?.name ?? historicalObject.typeId;
  const title = getObjectTitle(historicalObject);

  return (
    <Box
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - with version nav and close */}
      <Group
        justify="space-between"
        px="md"
        py="xs"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          minHeight: 44,
        }}
      >
        <Group gap="xs">
          <Text size="sm" fw={600}>Historical Version</Text>
          {objectChangePoints.length > 1 && (
            <Text size="xs" c="dimmed">
              ({currentVersionIndex + 1} of {objectChangePoints.length})
            </Text>
          )}
        </Group>
        <Group gap={4}>
          {objectChangePoints.length > 1 && (
            <>
              <Tooltip label="Previous version" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handlePrevVersion}
                  disabled={!canGoPrev}
                  aria-label="Previous version"
                >
                  <Icon name="chevron-left" size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Next version" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleNextVersion}
                  disabled={!canGoNext}
                  aria-label="Next version"
                >
                  <Icon name="chevron-right" size={14} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleClose}
            aria-label="Close comparison"
          >
            <Icon name="x" size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Content */}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="md" p="md">
          {/* Title section with inline metadata */}
          <Group gap="sm" align="flex-start">
            <Icon
              name={iconName}
              size={20}
              style={{ color: 'var(--mantine-color-gray-6)', marginTop: 2 }}
            />
            <Box>
              <Text size="lg" fw={600} lh={1.3}>{title}</Text>
              <Text size="xs" c="dimmed">{typeName} • {formattedTimestamp}</Text>
            </Box>
          </Group>

          {/* Properties Section - inline key:value pairs */}
          {visibleProperties.length > 0 && (
            <>
              <Divider />
              <Stack gap="xs">
                {visibleProperties.map(({ id, label, value }) => (
                  <Group key={id} gap="xs" wrap="nowrap">
                    <Text size="xs" c="dimmed" style={{ minWidth: 100, flexShrink: 0 }}>
                      {label}:
                    </Text>
                    <Text size="sm" style={{ wordBreak: 'break-word' }}>{value}</Text>
                  </Group>
                ))}
              </Stack>
            </>
          )}

          {/* Content Section - with diff highlighting */}
          {historicalObject.hasContent && (
            <>
              <Divider />
              <Box
                p="sm"
                style={{
                  borderRadius: 'var(--mantine-radius-sm)',
                  border: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <ContentPreview
                  content={historicalObject.properties.content as string | null}
                  maxHeight={400}
                />
              </Box>
            </>
          )}
        </Stack>
      </ScrollArea>

      {/* Footer with actions */}
      <Group
        justify="flex-end"
        gap="sm"
        px="md"
        py="sm"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Button variant="subtle" onClick={handleClose}>
          Close
        </Button>
        <Button
          variant="filled"
          color="ember"
          leftSection={<Icon name="rotate-ccw" size={14} />}
          onClick={handleRestoreClick}
        >
          Restore
        </Button>
      </Group>

      {/* Restore Dialog */}
      <RestoreDialog
        isOpen={restoreDialogOpen}
        scope="single"
        timestamp={splitPane.historicalTimestamp ?? 0}
        objectTitle={title}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />
    </Box>
  );
}
