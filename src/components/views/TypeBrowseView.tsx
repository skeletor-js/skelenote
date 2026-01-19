/**
 * TypeBrowseView - Browse all objects of a specific type
 * Displays objects grouped by date with selection and bulk actions
 */

import { useMemo, useCallback, useEffect, Fragment, useState } from 'react';
import { Stack, Text, Box, Loader, Center, Button } from '@mantine/core';
import { useSelection, usePinnedObjects, useDuplicate } from '@/hooks';
import {
  useNavigation,
  useObjects,
  useTypeRegistry,
  useToast,
} from '@/contexts';
import { EmptyState, ViewHeader } from '@/components/ui';
import { BulkActions } from '@/components/actions';
import { ObjectSearchModal } from '@/components/object/editors';
import { InboxRow } from './InboxRow';
import type { SkelenoteObject } from '@/lib/types';
import classes from './InboxRow.module.css';

/** Default number of items to load per page */
const PAGE_SIZE = 50;

/** Modal state for picker modals (single instance shared across all rows) */
interface PickerModalState {
  type: 'tag' | 'project' | 'area' | null;
  itemId: string | null;
}

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
  const { addToast } = useToast();
  const typeRegistry = useTypeRegistry();
  const { pinnedObjects, pin, unpin } = usePinnedObjects();
  const { duplicate, canDuplicate } = useDuplicate();
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Single shared modal state (instead of 3 modals per row)
  const [pickerModal, setPickerModal] = useState<PickerModalState>({
    type: null,
    itemId: null,
  });

  // Reset pagination when type changes
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [typeId]);

  // Create set of pinned IDs for fast lookup
  const pinnedSet = useMemo(
    () => new Set(pinnedObjects.map((obj) => obj.id)),
    [pinnedObjects]
  );

  // Get type definition for display
  const typeDef = typeRegistry.get(typeId);
  const typeName = typeDef?.name ?? 'Objects';
  const typeIcon = typeDef?.icon ?? 'file';

  // Get all objects of this type, sorted by creation date (newest first)
  const allItems = useMemo(() => {
    if (!store) return [];
    let result = store.getByType(typeId);

    // Filter out daily notes from the general 'note' view
    if (typeId === 'note') {
      result = result.filter((obj) => !obj.properties.isDailyNote);
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [store, typeId]);

  // Paginate items
  const items = useMemo(() => allItems.slice(0, limit), [allItems, limit]);

  // Pagination helpers
  const totalCount = allItems.length;
  const hasMore = limit < totalCount;
  const loadMore = useCallback(() => {
    setLimit((prev) => prev + PAGE_SIZE);
  }, []);

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

  // Handle pin toggle
  const handleTogglePin = useCallback(
    (id: string) => {
      if (pinnedSet.has(id)) {
        unpin(id);
        addToast({ type: 'success', message: 'Removed from pins' });
      } else {
        pin(id);
        addToast({ type: 'success', message: 'Pinned to sidebar' });
      }
    },
    [pinnedSet, pin, unpin, addToast]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    (id: string) => {
      duplicate(id);
    },
    [duplicate]
  );

  // Stable callbacks for row interactions
  const handleClick = useCallback(
    (id: string) => {
      navigateToObject(id);
    },
    [navigateToObject]
  );

  const handleOpenInSplit = useCallback(
    (id: string) => {
      openInSplit(id);
    },
    [openInSplit]
  );

  // Picker modal callbacks (single modal shared across all rows)
  const openTagPicker = useCallback((itemId: string) => {
    setPickerModal({ type: 'tag', itemId });
  }, []);

  const openProjectPicker = useCallback((itemId: string) => {
    setPickerModal({ type: 'project', itemId });
  }, []);

  const openAreaPicker = useCallback((itemId: string) => {
    setPickerModal({ type: 'area', itemId });
  }, []);

  const closePickerModal = useCallback(() => {
    setPickerModal({ type: null, itemId: null });
  }, []);

  // Handle tag selection from modal
  const handleAddTag = useCallback(
    (tagId: string) => {
      if (!store || !pickerModal.itemId) return;
      const item = store.get(pickerModal.itemId);
      if (!item) return;

      const currentTags = (item.properties.tags as string[]) ?? [];
      if (!currentTags.includes(tagId)) {
        store.update(pickerModal.itemId, {
          properties: { ...item.properties, tags: [...currentTags, tagId] },
        });
        refreshData();
        addToast({ type: 'success', message: 'Tag added' });
      }
      closePickerModal();
    },
    [store, pickerModal.itemId, refreshData, addToast, closePickerModal]
  );

  // Handle project selection from modal
  const handleAssignProject = useCallback(
    (projectId: string) => {
      if (!store || !pickerModal.itemId) return;
      const item = store.get(pickerModal.itemId);
      if (!item) return;

      store.update(pickerModal.itemId, {
        properties: { ...item.properties, project: projectId },
      });
      refreshData();
      addToast({ type: 'success', message: 'Project assigned' });
      closePickerModal();
    },
    [store, pickerModal.itemId, refreshData, addToast, closePickerModal]
  );

  // Handle area selection from modal
  const handleAssignArea = useCallback(
    (areaId: string) => {
      if (!store || !pickerModal.itemId) return;
      const item = store.get(pickerModal.itemId);
      if (!item) return;

      store.update(pickerModal.itemId, {
        properties: { ...item.properties, area: areaId },
      });
      refreshData();
      addToast({ type: 'success', message: 'Area assigned' });
      closePickerModal();
    },
    [store, pickerModal.itemId, refreshData, addToast, closePickerModal]
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
        count={totalCount > 0 ? totalCount : undefined}
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
                      onClick={handleClick}
                      onOpenInSplit={handleOpenInSplit}
                      onArchive={handleArchive}
                      isSelected={selection.isSelected(item.id)}
                      onSelectionChange={handleSelectionChange}
                      isSelectingMode={selection.hasSelection}
                      isPinned={pinnedSet.has(item.id)}
                      onTogglePin={handleTogglePin}
                      canDuplicate={canDuplicate(item.id)}
                      onDuplicate={handleDuplicate}
                      onOpenTagPicker={openTagPicker}
                      onOpenProjectPicker={openProjectPicker}
                      onOpenAreaPicker={openAreaPicker}
                    />
                  ))}
                </Stack>
              </Fragment>
            ))}

            {/* Load More button */}
            {hasMore && (
              <Button
                variant="subtle"
                color="gray"
                fullWidth
                onClick={loadMore}
                mt="sm"
                size="sm"
              >
                Load more ({items.length} of {totalCount})
              </Button>
            )}
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

      {/* Shared Picker Modals (single instance instead of 3 per row) */}
      <ObjectSearchModal
        isOpen={pickerModal.type === 'tag'}
        onClose={closePickerModal}
        onSelect={handleAddTag}
        targetTypeIds={['tag']}
        title="Add Tag"
      />
      <ObjectSearchModal
        isOpen={pickerModal.type === 'project'}
        onClose={closePickerModal}
        onSelect={handleAssignProject}
        targetTypeIds={['project']}
        title="Assign to Project"
      />
      <ObjectSearchModal
        isOpen={pickerModal.type === 'area'}
        onClose={closePickerModal}
        onSelect={handleAssignArea}
        targetTypeIds={['area']}
        title="Assign to Area"
      />
    </Stack>
  );
}
