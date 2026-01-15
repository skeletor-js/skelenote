/**
 * Mobile-optimized Inbox View
 * Features: date grouping, swipeable rows, pull-to-refresh, FAB for quick capture
 */

import { useMemo, useCallback, useState, Fragment } from 'react';
import { Stack, Text, Box, Center, Loader, Button } from '@mantine/core';
import { Plus, Inbox } from 'lucide-react';
import { useInbox } from '@/hooks';
import { useNavigation } from '@/contexts';
import {
  MobileViewHeader,
  PullToRefresh,
  FAB,
  ActionSheet,
  type ActionSheetItem,
} from '../primitives';
import { MobileInboxRow } from '../rows';
import { QuickCaptureSheet } from '../sheets';
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

  // Action sheet state for long-press menu
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SkelenoteObject | null>(
    null
  );

  // Quick capture sheet state
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  // Group items by date
  const groupedItems = useMemo(() => groupItemsByDate(items), [items]);

  // Get non-empty groups in order
  const dateGroups: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];
  const nonEmptyGroups = dateGroups.filter(
    (group) => groupedItems[group].length > 0
  );

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    // In a real app, this might trigger a sync
    // For now, just a small delay to show the animation
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Long press handler - opens action sheet
  const handleLongPress = useCallback((item: SkelenoteObject) => {
    setSelectedItem(item);
    setActionSheetOpen(true);
  }, []);

  // Quick capture (FAB action)
  const handleQuickCapture = useCallback(() => {
    setQuickCaptureOpen(true);
  }, []);

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
          onAction: () => archiveItem(selectedItem.id),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'danger',
          onAction: () => deleteItem(selectedItem.id),
        },
      ]
    : [];

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Inbox" showSync />
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
              <Button
                variant="light"
                color="ember"
                size="md"
                leftSection={<Plus size={18} />}
                onClick={handleQuickCapture}
              >
                Quick capture
              </Button>
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
                  {groupedItems[group].map((item) => (
                    <MobileInboxRow
                      key={item.id}
                      item={item}
                      onPress={() => navigateToObject(item.id)}
                      onLongPress={() => handleLongPress(item)}
                      onProcess={processItem}
                      onArchive={archiveItem}
                      onDelete={deleteItem}
                    />
                  ))}
                </Fragment>
              ))}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* FAB for quick capture */}
      <FAB icon={Plus} label="Quick capture" onClick={handleQuickCapture} />

      {/* Quick capture sheet */}
      <QuickCaptureSheet
        opened={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
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
    </Stack>
  );
}
