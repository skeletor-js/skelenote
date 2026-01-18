/**
 * Mobile-optimized Saved View Results
 * Displays filtered objects based on the active saved view configuration
 */

import { useMemo, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  Center,
  Loader,
  Badge,
  Group,
  UnstyledButton,
} from '@mantine/core';
import { ChevronRight } from 'lucide-react';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useSavedViews } from '@/hooks';
import { executeQuery, type FilterCondition } from '@/lib/loro';
import { Icon } from '@/components/ui/Icon';
import {
  MobileViewHeader,
  PullToRefresh,
  EmptyState,
  SwipeableRow,
} from '../primitives';
import {
  BUILT_IN_FIELDS,
  OPERATOR_LABELS,
  formatDateValue,
  formatBooleanValue,
} from '@/lib/views';
import { getIconFromEmoji } from '@/lib/icons';

export function MobileSavedViewResultsView() {
  const { activeSavedViewId, navigateToView, navigateToObject } =
    useNavigation();
  const { store, isLoading, refreshData } = useObjects();
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

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

  // Get type definition for display
  const getTypeDef = useCallback(
    (typeId: string) => {
      return typeRegistry.get(typeId);
    },
    [typeRegistry]
  );

  // Format a filter for display
  const formatFilter = useCallback(
    (filter: FilterCondition, typeFilter?: string) => {
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
        const isDateField =
          fieldType === 'date' ||
          filter.field === 'createdAt' ||
          filter.field === 'updatedAt' ||
          filter.field === 'dueDate' ||
          filter.field === 'startTime';

        const isBooleanField =
          fieldType === 'checkbox' ||
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
    },
    [getTypeDef]
  );

  // Render icon - either as Lucide icon name or emoji fallback
  const renderViewIcon = (icon: string | undefined) => {
    const iconValue = icon || 'clipboard';
    if (/^[a-z-]+$/.test(iconValue)) {
      // It's likely a Lucide icon name
      // We need to render it as a component, but Icon utility handles mapping
      // Here we just pass the name
      return iconValue;
    }
    return iconValue; // Emoji
  };

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Loading..."
          showBack
          onBack={() => navigateToView('saved-view')}
        />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  if (!view) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="View Not Found"
          showBack
          onBack={() => navigateToView('saved-view')}
        />
        <Center style={{ flex: 1 }}>
          <Text c="dimmed">The requested view could not be found.</Text>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader
        title={view.name}
        count={filteredObjects.length}
        showBack
        onBack={() => navigateToView('saved-view')}
      />

      {/* Filter Chips */}
      {view.filters.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Group gap="xs">
            {view.filters.map((filter, index) => {
              const { fieldName, operatorLabel, formattedValue } = formatFilter(
                filter,
                view.typeFilter ?? undefined
              );
              return (
                <Badge
                  key={index}
                  variant="light"
                  color="gray"
                  size="sm"
                  radius="sm"
                >
                  {fieldName} {operatorLabel}
                  {formattedValue ? ` ${formattedValue}` : ''}
                </Badge>
              );
            })}
          </Group>
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredObjects.length === 0 ? (
            <EmptyState
              icon={renderViewIcon(view.icon)}
              title="No matching items"
              description="No items match this view's filters."
            />
          ) : (
            <Stack gap={0}>
              {filteredObjects.map((obj) => {
                const typeDef = getTypeDef(obj.typeId);
                const title = (obj.properties.title ??
                  obj.properties.name ??
                  'Untitled') as string;
                const icon = typeDef?.icon ?? 'file-text';
                const typeName = typeDef?.name ?? obj.typeId;

                return (
                  <SwipeableRow
                    key={obj.id}
                    rightActions={[]} // TODO: Add actions based on type?
                    onPress={() => navigateToObject(obj.id)}
                  >
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                      {/* Icon */}
                      <Box
                        style={{
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8,
                          backgroundColor: 'var(--surface-overlay)',
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          name={getIconFromEmoji(icon)}
                          size={18}
                          style={{ color: 'var(--mantine-color-gray-7)' }}
                        />
                      </Box>

                      {/* Content */}
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {title}
                        </Text>
                        <Group gap="xs">
                          <Badge size="xs" variant="dot" color="gray">
                            {typeName}
                          </Badge>
                        </Group>
                      </Stack>

                      {/* Chevron */}
                      <ChevronRight
                        size={16}
                        style={{
                          color: 'var(--mantine-color-gray-4)',
                          flexShrink: 0,
                        }}
                      />
                    </Group>
                  </SwipeableRow>
                );
              })}
            </Stack>
          )}
        </Box>
      </PullToRefresh>
    </Stack>
  );
}
