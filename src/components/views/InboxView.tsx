/**
 * InboxView - main container for inbox view
 * Displays all objects with inboxed: true
 * Features: date grouping, hover-reveal actions, bulk selection
 */

import { useMemo, useCallback, useEffect, Fragment } from 'react';
import { Stack, Text, Box, Loader, Center } from '@mantine/core';
import { useInbox, useSelection } from '@/hooks';
import { useNavigation, useObjects } from '@/contexts';
import { EmptyState, ViewHeader } from '@/components/ui';
import { BulkActions } from '@/components/actions';
import { InboxRow } from './InboxRow';
import type { SkelenoteObject } from '@/lib/types';
import classes from './InboxRow.module.css';

/** Date group categories */
type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

/** Group items by creation date */
function groupItemsByDate(items: SkelenoteObject[]): Record<DateGroup, SkelenoteObject[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<DateGroup, SkelenoteObject[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Older': [],
  };

  for (const item of items) {
    const createdAt = new Date(item.createdAt);
    const itemDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());

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

export function InboxView() {
  const { items, isLoading, count, processItem, deleteItem } = useInbox();
  const { navigateToObject, openInSplit } = useNavigation();
  const { refreshData } = useObjects();

  // Get item IDs for selection hook
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  // Initialize selection
  const selection = useSelection({ allItems: itemIds });

  // Group items by date
  const groupedItems = useMemo(() => groupItemsByDate(items), [items]);

  // Get non-empty groups in order
  const dateGroups: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];
  const nonEmptyGroups = dateGroups.filter((group) => groupedItems[group].length > 0);

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

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Only handle if focus is in the inbox view area
        const activeElement = document.activeElement;
        if (activeElement?.closest('[data-inbox-view]')) {
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
        <Text ml="sm" c="dimmed">Loading...</Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }} data-inbox-view>
      <ViewHeader title="Inbox" count={count > 0 ? count : undefined} />
      <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
        {items.length === 0 ? (
          <EmptyState message="All clear! Nothing to process." size="large" />
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
                      onProcess={processItem}
                      onDelete={deleteItem}
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
