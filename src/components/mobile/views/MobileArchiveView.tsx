/**
 * Mobile-optimized Archive View
 * Features: date grouping, swipeable rows, pull-to-refresh, restore/delete actions
 */

import { useMemo, useCallback, useState, Fragment } from 'react';
import {
  Stack,
  Text,
  Box,
  Center,
  Loader,
  TextInput,
  Group,
} from '@mantine/core';
import { Archive, Search, ArchiveRestore, Trash2 } from 'lucide-react';
import { useArchive } from '@/hooks';
import { useNavigation } from '@/contexts';
import {
  MobileViewHeader,
  PullToRefresh,
  ActionSheet,
  type ActionSheetItem,
} from '../primitives';
import { MobileArchiveRow } from '../rows';
import type { SkelenoteObject } from '@/lib/types';

/** Date group categories */
type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

/** Group items by archive date (updatedAt) */
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
    const archivedAt = new Date(item.updatedAt);
    const itemDate = new Date(
      archivedAt.getFullYear(),
      archivedAt.getMonth(),
      archivedAt.getDate()
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

export function MobileArchiveView() {
  const { items, isLoading, count, unarchiveItem, deleteItem } = useArchive();
  const { navigateToObject, navigateToView } = useNavigation();

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Action sheet state for long-press menu
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SkelenoteObject | null>(
    null
  );

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const title = (item.properties.title ??
        item.properties.name ??
        '') as string;
      return title.toLowerCase().includes(query);
    });
  }, [items, searchQuery]);

  // Group items by date
  const groupedItems = useMemo(
    () => groupItemsByDate(filteredItems),
    [filteredItems]
  );

  // Get non-empty groups in order
  const dateGroups: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];
  const nonEmptyGroups = dateGroups.filter(
    (group) => groupedItems[group].length > 0
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Long press handler - opens action sheet
  const handleLongPress = useCallback((item: SkelenoteObject) => {
    setSelectedItem(item);
    setActionSheetOpen(true);
  }, []);

  // Handle restore
  const handleRestore = useCallback(
    (itemId: string) => {
      unarchiveItem(itemId);
    },
    [unarchiveItem]
  );

  // Handle delete
  const handleDelete = useCallback(
    (itemId: string) => {
      deleteItem(itemId);
    },
    [deleteItem]
  );

  // Action sheet items for selected item
  const actionSheetItems: ActionSheetItem[] = selectedItem
    ? [
        {
          id: 'restore',
          label: 'Restore',
          icon: ArchiveRestore,
          onAction: () => handleRestore(selectedItem.id),
        },
        {
          id: 'delete',
          label: 'Delete Permanently',
          icon: Trash2,
          variant: 'danger',
          onAction: () => handleDelete(selectedItem.id),
        },
      ]
    : [];

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Archive"
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
        title="Archive"
        count={count > 0 ? count : undefined}
        showBack
        onBack={() => navigateToView('browse')}
      />

      {/* Search bar */}
      {items.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search archived items..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredItems.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <Archive
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {items.length === 0
                  ? 'No archived items'
                  : 'No items match your search'}
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
                    <Group justify="space-between">
                      <Text size="sm" fw={600} c="gray.6" tt="uppercase">
                        {group}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {groupedItems[group].length}
                      </Text>
                    </Group>
                  </Box>

                  {/* Group items */}
                  {groupedItems[group].map((item) => (
                    <MobileArchiveRow
                      key={item.id}
                      item={item}
                      onPress={() => navigateToObject(item.id)}
                      onLongPress={() => handleLongPress(item)}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                    />
                  ))}
                </Fragment>
              ))}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

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
    </Stack>
  );
}
