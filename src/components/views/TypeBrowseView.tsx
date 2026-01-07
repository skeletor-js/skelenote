/**
 * TypeBrowseView - Browse all objects of a specific type
 * Displays objects grouped by date with selection and bulk actions
 */

import { useMemo, useCallback, useEffect, Fragment } from 'react';
import { Stack, Text, Box, Loader, Center } from '@mantine/core';
import { useSelection } from '@/hooks';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { EmptyState, ViewHeader } from '@/components/ui';
import { BulkActions } from '@/components/actions';
import { InboxRow } from './InboxRow';
import type { SkelenoteObject } from '@/lib/types';
import classes from './InboxRow.module.css';

/** Date group categories */
type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

/** Group items by creation date */
function groupItemsByDate(
  items: SkelenoteObject[]
): Record<DateGroup, SkelenoteObject[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<DateGroup, SkelenoteObject[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const item of items) {
    const createdAt = new Date(item.createdAt);
    const itemDate = new Date(
      createdAt.getFullYear(),
      createdAt.getMonth(),
      createdAt.getDate()
    );

    if (itemDate >= today) {
      groups['Today'].push(item);
    } else if (itemDate >= yesterday) {
      groups['Yesterday'].push(item);
    } else if (itemDate >= weekAgo) {
      groups['This Week'].push(item);
    } else {
      groups['Older'].push(item);
    }
  }

  return groups;
}

interface TypeBrowseViewProps {
  typeId: string;
}

export function TypeBrowseView({ typeId }: TypeBrowseViewProps) {
  const { navigateToObject, openInSplit } = useNavigation();
  const { store, isLoading, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();

  // Get type definition for display
  const typeDef = typeRegistry.get(typeId);
  const typeName = typeDef?.name ?? 'Objects';
  const typeIcon = typeDef?.icon ?? 'file';

  // Get all objects of this type, sorted by creation date (newest first)
  const items = useMemo(() => {
    if (!store) return [];
    let result = store.getByType(typeId);

    // Filter out daily notes from the general 'note' view
    if (typeId === 'note') {
      result = result.filter((obj) => !obj.properties.isDailyNote);
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [store, typeId]);

  // Get item IDs for selection hook
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  // Initialize selection
  const selection = useSelection({ allItems: itemIds });

  // Group items by date
  const groupedItems = useMemo(() => groupItemsByDate(items), [items]);

  // Get non-empty groups in order
  const dateGroups: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];
  const nonEmptyGroups = dateGroups.filter(
    (group) => groupedItems[group].length > 0
  );

  // Handle selection change (toggle or range)
  const handleSelectionChange = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey) {
        selection.selectRange(id);
      } else {
        selection.toggle(id);
      }
    },
    [selection]
  );

  // Handle archive
  const handleArchive = useCallback(
    (id: string) => {
      store?.archive(id);
      refreshData();
    },
    [store, refreshData]
  );

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const activeElement = document.activeElement;
        if (activeElement?.closest('[data-type-browse-view]')) {
          e.preventDefault();
          selection.selectAll();
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape' && selection.hasSelection) {
        e.preventDefault();
        selection.clear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection]);

  if (isLoading) {
    return (
      <Center p="xl">
        <Loader size="sm" />
        <Text ml="sm" c="dimmed">
          Loading...
        </Text>
      </Center>
    );
  }

  return (
    <Stack
      gap={0}
      h="100%"
      style={{ overflow: 'hidden' }}
      data-type-browse-view
    >
      <ViewHeader
        title={typeName}
        icon={typeIcon}
        count={items.length > 0 ? items.length : undefined}
      />
      <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
        {items.length === 0 ? (
          <EmptyState
            message={`No ${typeName.toLowerCase()}s yet`}
            size="large"
          />
        ) : (
          <Stack gap={0}>
            {nonEmptyGroups.map((group) => (
              <Fragment key={group}>
                {/* Group header */}
                <Text
                  size="xs"
                  c="dimmed"
                  fw={500}
                  tt="uppercase"
                  px="sm"
                  py="xs"
                  className={classes.groupHeader}
                >
                  {group}
                </Text>
                {/* Group items */}
                <Stack gap={2} mb="md">
                  {groupedItems[group].map((item) => (
                    <InboxRow
                      key={item.id}
                      item={item}
                      onClick={() => navigateToObject(item.id)}
                      onOpenInSplit={() => openInSplit(item.id)}
                      onArchive={handleArchive}
                      isSelected={selection.isSelected(item.id)}
                      onSelectionChange={handleSelectionChange}
                      isSelectingMode={selection.hasSelection}
                    />
                  ))}
                </Stack>
              </Fragment>
            ))}
          </Stack>
        )}
      </Box>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedIds={selection.selectedArray}
        onClearSelection={selection.clear}
        onActionComplete={refreshData}
        viewType="inbox"
      />
    </Stack>
  );
}
