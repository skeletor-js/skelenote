/**
 * Mobile-optimized Type Browse View
 * Two-level navigation:
 * 1. Type list - shows all object types with counts
 * 2. Filtered objects - shows objects of selected type, grouped by date
 */

import { useMemo, useCallback, useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stack,
  Text,
  Box,
  Center,
  Loader,
  TextInput,
  Group,
  Badge,
} from '@mantine/core';
import { Search, ChevronRight, Archive, Trash2 } from 'lucide-react';
import {
  useObjects,
  useNavigation,
  useTypeRegistry,
  useToast,
} from '@/contexts';
import {
  useSelection,
  useConfirmDialog,
  useReducedMotion,
  useUndoToast,
  useHaptics,
} from '@/hooks';
import { listItem } from '@/lib/animations';
import {
  MobileViewHeader,
  PullToRefresh,
  SelectionToolbar,
  ActionSheet,
  ConfirmDialog,
  HeaderAddButton,
  type ActionSheetItem,
} from '../primitives';
import { MobileInboxRow } from '../rows';
import { BulkActionsSheet, type BulkActionType } from '../sheets';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type { SkelenoteObject } from '@/lib/types';

interface TypeWithCount {
  id: string;
  name: string;
  icon: string;
  count: number;
  isBuiltIn: boolean;
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

/**
 * Type Objects List - shows filtered objects for a selected type
 */
interface TypeObjectsListProps {
  typeId: string;
}

function TypeObjectsList({ typeId }: TypeObjectsListProps) {
  const { store, isLoading, dataVersion, refreshData } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { confirm } = useConfirmDialog();
  const reduceMotion = useReducedMotion();
  const { showArchiveUndo, showDeleteUndo } = useUndoToast();
  const { notification } = useHaptics();
  const { addToast } = useToast();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, typeId, dataVersion]);

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
      store?.archive(item.id);
      refreshData();
      showArchiveUndo(item);
    },
    [store, refreshData, showArchiveUndo]
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
        store?.delete(item.id);
        refreshData();
      }
    },
    [confirm, store, refreshData, showDeleteUndo]
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

  // Process handler (marks as not inboxed - for inbox items)
  const handleProcess = useCallback(
    (itemId: string) => {
      store?.markProcessed(itemId);
      refreshData();
    },
    [store, refreshData]
  );

  // Action sheet items for selected item
  const actionSheetItems: ActionSheetItem[] = selectedItem
    ? [
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
              store?.archive(id);
            }
            refreshData();
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
              message: 'Action not available',
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
    [selection, store, refreshData, addToast]
  );

  // Bulk delete confirmation handler
  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selection.selectedCount === 0) return;

    await notification('warning');

    const selectedIds = selection.selectedArray;
    for (const id of selectedIds) {
      store?.delete(id);
    }
    refreshData();

    addToast({
      type: 'success',
      message: `Deleted ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}`,
    });

    selection.clear();
    setBulkDeleteConfirmOpen(false);
  }, [selection, store, refreshData, notification, addToast]);

  // Navigate back to type list
  const handleBack = useCallback(() => {
    navigateToView('type-browse');
  }, [navigateToView]);

  // Create new object of this type
  const handleCreate = useCallback(() => {
    if (!store || !typeDef) return;

    // Create new object with content if the type supports it
    const newObj = store.create({
      typeId,
      properties: {},
      withContent: typeDef.hasContent,
      inboxed: false, // Skip inbox since user is actively creating
    });

    refreshData();
    navigateToObject(newObj.id);
  }, [store, typeDef, typeId, refreshData, navigateToObject]);

  // Get icon name for header
  const iconName: IconName = getIconFromEmoji(typeIcon);

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title={typeName} showBack onBack={handleBack} />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader
        title={typeName}
        count={items.length > 0 ? items.length : undefined}
        showBack
        onBack={handleBack}
        rightSection={
          !selection.hasSelection ? (
            <HeaderAddButton label={`New ${typeName}`} onClick={handleCreate} />
          ) : undefined
        }
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
              <Icon
                name={iconName}
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                No {typeName.toLowerCase()}s yet
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
                          onProcess={handleProcess}
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

/**
 * Type Selector List - shows all object types with counts
 */
function TypeSelectorList() {
  const { store, isLoading, dataVersion } = useObjects();
  const { navigateToView, navigateToTypeBrowse } = useNavigation();
  const typeRegistry = useTypeRegistry();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get all types with object counts
  const typesWithCounts = useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const allTypes = typeRegistry.getAll();

    // Calculate counts for each type
    const typeCountMap = new Map<string, number>();
    for (const obj of allObjects) {
      const count = typeCountMap.get(obj.typeId) || 0;
      typeCountMap.set(obj.typeId, count + 1);
    }

    // Build type list with counts
    const types: TypeWithCount[] = allTypes
      .filter((type) => type.id !== 'template') // Exclude template type from browsing
      .map((type) => ({
        id: type.id,
        name: type.name,
        icon: type.icon,
        count: typeCountMap.get(type.id) || 0,
        isBuiltIn: type.isBuiltIn,
      }));

    // Sort: built-in types first (by name), then custom types (by name)
    return types.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) {
        return a.isBuiltIn ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, typeRegistry, dataVersion]);

  // Filter by search query
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return typesWithCounts;
    const query = searchQuery.toLowerCase();
    return typesWithCounts.filter((type) => {
      return type.name.toLowerCase().includes(query);
    });
  }, [typesWithCounts, searchQuery]);

  // Total count for header
  const totalCount = useMemo(() => {
    return typesWithCounts.reduce((sum, type) => sum + type.count, 0);
  }, [typesWithCounts]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Handle type tap - navigate to type browse filtered view
  const handleTypePress = useCallback(
    (typeId: string) => {
      navigateToTypeBrowse(typeId);
    },
    [navigateToTypeBrowse]
  );

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Browse Types"
          showBack
          onBack={() => navigateToView('browse')}
        />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader
        title="Browse Types"
        count={totalCount > 0 ? totalCount : undefined}
        showBack
        onBack={() => navigateToView('browse')}
      />

      {/* Search bar */}
      {typesWithCounts.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search types..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredTypes.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <Text size="md" c="dimmed" ta="center">
                {typesWithCounts.length === 0
                  ? 'No objects yet'
                  : 'No types match your search'}
              </Text>
            </Stack>
          ) : (
            // Type list
            <Stack gap={0}>
              {filteredTypes.map((type) => {
                const iconName: IconName = getIconFromEmoji(type.icon);

                return (
                  <Box
                    key={type.id}
                    onClick={() => handleTypePress(type.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--surface-paper)',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
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
                          name={iconName}
                          size={18}
                          style={{ color: 'var(--mantine-color-gray-7)' }}
                        />
                      </Box>

                      {/* Name */}
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500}>
                          {type.name}
                        </Text>
                        {!type.isBuiltIn && (
                          <Text size="xs" c="dimmed">
                            Custom type
                          </Text>
                        )}
                      </Stack>

                      {/* Count badge */}
                      {type.count > 0 && (
                        <Badge size="sm" variant="light" color="gray">
                          {type.count}
                        </Badge>
                      )}

                      {/* Chevron */}
                      <ChevronRight
                        size={16}
                        style={{
                          color: 'var(--mantine-color-gray-4)',
                          flexShrink: 0,
                        }}
                      />
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </PullToRefresh>
    </Stack>
  );
}

/**
 * Main component - switches between type list and filtered objects
 */
export function MobileTypeBrowseView() {
  const { browseTypeId } = useNavigation();

  // If browseTypeId is set, show filtered objects for that type
  if (browseTypeId) {
    return <TypeObjectsList typeId={browseTypeId} />;
  }

  // Otherwise show type selector list
  return <TypeSelectorList />;
}
