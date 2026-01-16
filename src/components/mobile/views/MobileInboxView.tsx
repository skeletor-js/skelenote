/**
 * Mobile-optimized Inbox View
 * Features: date grouping, swipeable rows, pull-to-refresh, header button for quick capture
 */

import { useMemo, useCallback, useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stack, Text, Box, Center, Loader } from '@mantine/core';
import { Inbox } from 'lucide-react';
import {
  useInbox,
  useConfirmDialog,
  useReducedMotion,
  useUndoToast,
  useSelection,
  useHaptics,
} from '@/hooks';
import { listItem } from '@/lib/animations';
import { useNavigation, useObjects, useToast } from '@/contexts';
import {
  MobileViewHeader,
  PullToRefresh,
  ActionSheet,
  SelectionToolbar,
  ConfirmDialog,
  type ActionSheetItem,
} from '../primitives';
import { MobileInboxRow } from '../rows';
import { BulkActionsSheet, type BulkActionType } from '../sheets';
import type { SkelenoteObject } from '@/lib/types';
import { Archive, Trash2, Circle } from 'lucide-react';

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

export function MobileInboxView() {
  const { items, isLoading, count, processItem, archiveItem, deleteItem } =
    useInbox();
  const { navigateToObject } = useNavigation();
  const { refreshData } = useObjects();
  const { confirm } = useConfirmDialog();
  const reduceMotion = useReducedMotion();
  const { showArchiveUndo, showDeleteUndo } = useUndoToast();
  const { notification } = useHaptics();
  const { addToast } = useToast();

  // Selection mode state
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const selection = useSelection({ allItems: itemIds });
  const [bulkActionsSheetOpen, setBulkActionsSheetOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Action sheet state for long-press menu
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SkelenoteObject | null>(
    null
  );

  // Group items by date
  const groupedItems = useMemo(() => groupItemsByDate(items), [items]);

  // Get non-empty groups in order
  const dateGroups: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];
  const nonEmptyGroups = dateGroups.filter(
    (group) => groupedItems[group].length > 0
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

  // Long press handler - enters selection mode or shows action sheet
  const handleLongPress = useCallback(
    async (item: SkelenoteObject) => {
      if (!selection.hasSelection) {
        // Enter selection mode with haptic feedback
        await notification('success');
        selection.toggle(item.id);
      } else {
        // Already in selection mode, show action sheet
        setSelectedItem(item);
        setActionSheetOpen(true);
      }
    },
    [selection, notification]
  );

  // Archive with undo toast
  const handleArchive = useCallback(
    (item: SkelenoteObject) => {
      archiveItem(item.id);
      showArchiveUndo(item);
    },
    [archiveItem, showArchiveUndo]
  );

  // Archive by ID with undo toast (for swipe actions)
  const handleArchiveById = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        handleArchive(item);
      }
    },
    [items, handleArchive]
  );

  // Delete with confirmation and undo toast
  const handleDelete = useCallback(
    async (item: SkelenoteObject) => {
      setActionSheetOpen(false);

      const title = (item.properties.title ??
        item.properties.name ??
        'Untitled') as string;

      const confirmed = await confirm({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${title}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (confirmed) {
        showDeleteUndo(item);
        deleteItem(item.id);
      }
    },
    [confirm, deleteItem, showDeleteUndo]
  );

  // Delete by ID with confirmation (for swipe actions)
  const handleDeleteById = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        handleDelete(item);
      }
    },
    [items, handleDelete]
  );

  // Action sheet items for selected item
  const actionSheetItems: ActionSheetItem[] = selectedItem
    ? [
        {
          id: 'process',
          label: 'Mark as Processed',
          icon: Circle,
          onAction: () => processItem(selectedItem.id),
        },
        {
          id: 'archive',
          label: 'Archive',
          icon: Archive,
          onAction: () => handleArchive(selectedItem),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'danger',
          onAction: () => handleDelete(selectedItem),
        },
      ]
    : [];

  // Bulk action handler
  const handleBulkAction = useCallback(
    async (action: BulkActionType) => {
      if (selection.selectedCount === 0) return;

      setBulkActionLoading(true);

      try {
        const selectedIds = selection.selectedArray;

        switch (action) {
          case 'archive':
            for (const id of selectedIds) {
              archiveItem(id);
            }
            addToast({
              type: 'success',
              message: `Archived ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}`,
            });
            break;

          case 'delete':
            // Show confirmation dialog
            setBulkActionsSheetOpen(false);
            setTimeout(() => setBulkDeleteConfirmOpen(true), 200);
            setBulkActionLoading(false);
            return; // Don't clear selection yet

          default:
            addToast({
              type: 'info',
              message: 'Action not available for inbox items',
            });
            break;
        }

        // Clear selection and close sheet
        selection.clear();
        setBulkActionsSheetOpen(false);
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selection, archiveItem, addToast]
  );

  // Bulk delete confirmation handler
  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selection.selectedCount === 0) return;

    await notification('warning');

    const selectedIds = selection.selectedArray;
    for (const id of selectedIds) {
      deleteItem(id);
    }

    addToast({
      type: 'success',
      message: `Deleted ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}`,
    });

    selection.clear();
    setBulkDeleteConfirmOpen(false);
  }, [selection, deleteItem, notification, addToast]);

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Inbox" showSync showBack={false} />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader
        title="Inbox"
        count={count > 0 ? count : undefined}
        showSync
        showSearch
        showBack={false}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {items.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <Inbox
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                All clear! Nothing to process.
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Tap the + button to capture something new.
              </Text>
            </Stack>
          ) : (
            // Grouped list
            <Stack gap={0}>
              {nonEmptyGroups.map((group) => (
                <Fragment key={group}>
                  {/* Date group header */}
                  <Box
                    px="md"
                    py="sm"
                    style={{
                      backgroundColor: 'var(--surface-canvas)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Text size="sm" fw={600} c="gray.6" tt="uppercase">
                      {group}
                    </Text>
                  </Box>

                  {/* Group items */}
                  <AnimatePresence initial={false}>
                    {groupedItems[group].map((item) => (
                      <motion.div
                        key={item.id}
                        variants={reduceMotion ? undefined : listItem}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        style={{ overflow: 'hidden' }}
                      >
                        <MobileInboxRow
                          item={item}
                          onPress={() => navigateToObject(item.id)}
                          onLongPress={() => handleLongPress(item)}
                          onProcess={processItem}
                          onArchive={handleArchiveById}
                          onDelete={handleDeleteById}
                          selectionMode={selection.hasSelection}
                          isSelected={selection.isSelected(item.id)}
                          onToggleSelection={selection.toggle}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Fragment>
              ))}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* Selection toolbar */}
      <SelectionToolbar
        count={selection.selectedCount}
        visible={selection.hasSelection}
        onClear={selection.clear}
        onActionsPress={() => setBulkActionsSheetOpen(true)}
      />

      {/* Action sheet for long-press menu */}
      <ActionSheet
        opened={actionSheetOpen}
        onClose={() => {
          setActionSheetOpen(false);
          setSelectedItem(null);
        }}
        title={
          selectedItem
            ? ((selectedItem.properties.title ??
                selectedItem.properties.name ??
                'Untitled') as string)
            : undefined
        }
        actions={actionSheetItems}
      />

      {/* Bulk Actions Sheet */}
      <BulkActionsSheet
        opened={bulkActionsSheetOpen}
        onClose={() => setBulkActionsSheetOpen(false)}
        count={selection.selectedCount}
        onAction={handleBulkAction}
        isLoading={bulkActionLoading}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        opened={bulkDeleteConfirmOpen}
        onClose={() => {
          setBulkDeleteConfirmOpen(false);
        }}
        onConfirm={handleBulkDeleteConfirm}
        title={`Delete ${selection.selectedCount} Item${selection.selectedCount !== 1 ? 's' : ''}`}
        message={`Are you sure you want to delete ${selection.selectedCount} item${selection.selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        destructive
      />
    </Stack>
  );
}
