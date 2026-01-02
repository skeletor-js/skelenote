/**
 * SavedViewContent - Displays filtered objects based on a saved view configuration
 */

import { useMemo, useCallback } from 'react';
import { Stack, Group, Text, Badge, Box, UnstyledButton, ActionIcon, Tooltip } from '@mantine/core';
import { useNavigation, useObjects, useTypeRegistry, useToast } from '@/contexts';
import { useSavedViews, useConfirmDialog, usePinnedObjects } from '@/hooks';
import { executeQuery, type FilterCondition } from '@/lib/loro';
import { formatRelativeDate } from '@/lib/utils/date';
import { EmptyState, Icon, ViewHeader, ConfirmDialog } from '@/components/ui';
import { getIconFromEmoji } from '@/lib/icons';
import {
  BUILT_IN_FIELDS,
  OPERATOR_LABELS,
  formatDateValue,
  formatBooleanValue,
} from '@/lib/views';
import styles from './SavedViewContent.module.css';

// Row component for saved view items with hover-reveal actions
interface SavedViewRowProps {
  obj: { id: string; typeId: string; properties: Record<string, unknown>; updatedAt: number };
  title: string;
  icon: string;
  typeName: string;
  onClick: () => void;
  onOpenInSplit: () => void;
  onDelete: () => void;
}

function SavedViewRow({ obj, title, icon, typeName, onClick, onOpenInSplit, onDelete }: SavedViewRowProps) {
  const { addToast } = useToast();
  const { isPinned, pin, unpin } = usePinnedObjects();
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  const itemIsPinned = isPinned(obj.id);

  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (itemIsPinned) {
      unpin(obj.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(obj.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [itemIsPinned, pin, unpin, obj.id, addToast]);

  const handleOpenInSplit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenInSplit();
  }, [onOpenInSplit]);

  const handleDeleteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: `Delete ${typeName}?`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      onDelete();
      addToast({ type: 'success', message: `"${title}" deleted` });
    }
  }, [confirm, typeName, title, onDelete, addToast]);

  return (
    <>
      <UnstyledButton
        onClick={onClick}
        p="xs"
        className={styles.row}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-sm)',
          borderRadius: 'var(--mantine-radius-sm)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Icon name={getIconFromEmoji(icon)} size={16} style={{ color: 'var(--mantine-color-gray-6)', flexShrink: 0 }} />
        <Text size="sm" style={{ flex: 1 }} truncate>
          {title}
        </Text>
        <Badge size="xs" variant="light" color="gray" radius="sm">
          {typeName}
        </Badge>
        <Text size="xs" c="dimmed">
          {formatRelativeDate(obj.updatedAt)}
        </Text>

        {/* Hover-reveal action icons */}
        <Group gap={4} className={styles.actions} wrap="nowrap">
          <Tooltip label="Open in split pane" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleOpenInSplit}
              aria-label="Open in split pane"
            >
              <Icon name="columns-2" size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={itemIsPinned ? 'Unpin' : 'Pin to sidebar'} position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleTogglePin}
              aria-label={itemIsPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
            >
              <Icon name="pin" size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="brick"
              onClick={handleDeleteClick}
              aria-label="Delete"
            >
              <Icon name="trash-2" size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </UnstyledButton>

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

export function SavedViewContent() {
  const { activeSavedViewId, navigateToObject, openInSplit } = useNavigation();
  const { store } = useObjects();
  const { getView } = useSavedViews();
  const typeRegistry = useTypeRegistry();

  // Get the saved view
  const view = useMemo(() => {
    if (!activeSavedViewId) return null;
    return getView(activeSavedViewId);
  }, [activeSavedViewId, getView]);

  // Get filtered objects
  const filteredObjects = useMemo(() => {
    if (!view || !store) return [];

    // Get all objects, optionally filtered by type
    let objects = store.getAll();

    // Apply type filter if specified
    if (view.typeFilter) {
      objects = objects.filter((obj) => obj.typeId === view.typeFilter);
    }

    // Apply query filters and sort
    return executeQuery(objects, {
      filters: view.filters,
      sort: view.sort,
    });
  }, [view, store]);

  // Get type definition for display
  const getTypeDef = useCallback((typeId: string) => {
    return typeRegistry.get(typeId);
  }, [typeRegistry]);

  // Format a filter for display
  const formatFilter = useCallback((filter: FilterCondition, typeFilter?: string) => {
    // Get field name - first check built-in fields
    const builtInField = BUILT_IN_FIELDS.find((f) => f.id === filter.field);
    let fieldName = builtInField?.name || filter.field;
    let fieldType = builtInField?.type;

    // Try to get field info from type schema
    if (typeFilter) {
      const typeDef = getTypeDef(typeFilter);
      if (typeDef) {
        const fieldDef = typeDef.schema.find((f) => f.id === filter.field);
        if (fieldDef) {
          fieldName = fieldDef.name;
          fieldType = fieldDef.type;
        }
      }
    }

    // Get operator label
    const operatorLabel = OPERATOR_LABELS[filter.operator] || filter.operator;

    // Format value based on field type or field name
    let formattedValue = '';

    // Skip value for isNull/isNotNull operators
    if (filter.operator !== 'isNull' && filter.operator !== 'isNotNull') {
      const isDateField = fieldType === 'date' ||
        filter.field === 'createdAt' ||
        filter.field === 'updatedAt' ||
        filter.field === 'dueDate' ||
        filter.field === 'startTime';

      const isBooleanField = fieldType === 'checkbox' ||
        fieldType === 'boolean' ||
        filter.field === 'inboxed' ||
        filter.field === 'isDailyNote';

      if (isDateField) {
        formattedValue = formatDateValue(filter.value);
      } else if (isBooleanField) {
        formattedValue = formatBooleanValue(filter.value);
      } else {
        formattedValue = String(filter.value ?? '');
      }
    }

    return { fieldName, operatorLabel, formattedValue };
  }, [getTypeDef]);

  if (!view) {
    return (
      <Box p="md">
        <EmptyState message="View not found" size="large" />
      </Box>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      <ViewHeader
        icon={view.icon || '📋'}
        title={view.name}
        count={filteredObjects.length}
        afterTitle={
          view.filters.length > 0 ? (
            <Group gap="xs" wrap="nowrap">
              {view.filters.map((filter, index) => {
                const { fieldName, operatorLabel, formattedValue } = formatFilter(filter, view.typeFilter ?? undefined);
                return (
                  <Badge key={index} variant="light" color="gray" size="xs" radius="sm">
                    {fieldName} {operatorLabel}{formattedValue ? ` ${formattedValue}` : ''}
                  </Badge>
                );
              })}
            </Group>
          ) : undefined
        }
      />
      <Box p="sm" style={{ flex: 1, overflow: 'auto' }}>
        {filteredObjects.length === 0 ? (
          <EmptyState message="No items match this view's filters" size="large" />
        ) : (
          <Stack gap={2}>
            {filteredObjects.map((obj) => {
              const typeDef = getTypeDef(obj.typeId);
              const title = (obj.properties.title ?? obj.properties.name ?? 'Untitled') as string;
              const icon = typeDef?.icon ?? '📄';
              const typeName = typeDef?.name ?? obj.typeId;

              return (
                <SavedViewRow
                  key={obj.id}
                  obj={obj}
                  title={title}
                  icon={icon}
                  typeName={typeName}
                  onClick={() => navigateToObject(obj.id)}
                  onOpenInSplit={() => openInSplit(obj.id)}
                  onDelete={() => store?.delete(obj.id)}
                />
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
