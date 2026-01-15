/**
 * Mobile-optimized Saved Views List
 * Features: list of saved views with icons, tap to apply, FAB to create, swipe actions
 */

import { useMemo, useCallback, useState } from 'react';
import {
  Stack,
  Text,
  Box,
  Center,
  Loader,
  TextInput,
  Group,
} from '@mantine/core';
import { Search, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigation } from '@/contexts';
import { useSavedViews, useConfirmDialog } from '@/hooks';
import {
  MobileViewHeader,
  PullToRefresh,
  FAB,
  SwipeableRow,
  ActionSheet,
  type ActionSheetItem,
} from '../primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { SavedView } from '@/lib/types';

export function MobileSavedViewsView() {
  const { navigateToView, navigateToSavedView } = useNavigation();
  const { views, deleteView, isLoading } = useSavedViews();
  const { confirm } = useConfirmDialog();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Action sheet state
  const [actionSheetView, setActionSheetView] = useState<SavedView | null>(
    null
  );

  // Filter by search query
  const filteredViews = useMemo(() => {
    if (!searchQuery.trim()) return views;
    const query = searchQuery.toLowerCase();
    return views.filter((view) => {
      return view.name.toLowerCase().includes(query);
    });
  }, [views, searchQuery]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Handle view tap - apply the saved view
  const handleViewPress = useCallback(
    (viewId: string) => {
      navigateToSavedView(viewId);
    },
    [navigateToSavedView]
  );

  // Handle long press - show action sheet
  const handleLongPress = useCallback((view: SavedView) => {
    setActionSheetView(view);
  }, []);

  // Handle delete with confirmation
  const handleDelete = useCallback(
    async (view: SavedView) => {
      setActionSheetView(null);

      const confirmed = await confirm({
        title: 'Delete View',
        message: `Are you sure you want to delete "${view.name}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (confirmed) {
        deleteView(view.id);
      }
    },
    [confirm, deleteView]
  );

  // Handle edit - for now just close action sheet (TODO: implement editor sheet)
  const handleEdit = useCallback((_view: SavedView) => {
    setActionSheetView(null);
    // TODO: Open SavedViewEditorSheet
  }, []);

  // Handle create - navigate to create flow (TODO: implement editor sheet)
  const handleCreate = useCallback(() => {
    // TODO: Open SavedViewEditorSheet for new view
  }, []);

  // Render icon - either as Lucide icon name or emoji fallback
  const renderIcon = (icon: string | undefined): React.ReactNode => {
    const iconValue = icon || 'clipboard';
    if (/^[a-z-]+$/.test(iconValue)) {
      return (
        <Icon
          name={iconValue as IconName}
          size={18}
          style={{ color: 'var(--mantine-color-gray-7)' }}
        />
      );
    }
    return <span style={{ fontSize: 18 }}>{iconValue}</span>;
  };

  // Action sheet actions
  const actionSheetActions: ActionSheetItem[] = actionSheetView
    ? [
        {
          id: 'edit',
          label: 'Edit View',
          icon: Pencil,
          onAction: () => handleEdit(actionSheetView),
        },
        {
          id: 'delete',
          label: 'Delete View',
          icon: Trash2,
          onAction: () => handleDelete(actionSheetView),
          variant: 'danger',
        },
      ]
    : [];

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Saved Views"
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
        title="Saved Views"
        count={views.length > 0 ? views.length : undefined}
        showBack
        onBack={() => navigateToView('browse')}
      />

      {/* Search bar */}
      {views.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search saved views..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredViews.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <Icon
                name="clipboard"
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {views.length === 0
                  ? 'No saved views yet'
                  : 'No views match your search'}
              </Text>
              {views.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  Save filter combinations for quick access
                </Text>
              )}
            </Stack>
          ) : (
            // View list
            <Stack gap={0}>
              {filteredViews.map((view) => (
                <SwipeableRow
                  key={view.id}
                  leftActions={[
                    {
                      id: 'edit',
                      icon: Pencil,
                      color: 'sage',
                      label: 'Edit',
                      onAction: () => handleEdit(view),
                    },
                  ]}
                  rightActions={[
                    {
                      id: 'delete',
                      icon: Trash2,
                      color: 'brick',
                      label: 'Delete',
                      onAction: () => handleDelete(view),
                    },
                  ]}
                  onLongPress={() => handleLongPress(view)}
                >
                  <Box
                    onClick={() => handleViewPress(view.id)}
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
                        {renderIcon(view.icon)}
                      </Box>

                      {/* Name and filter count */}
                      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {view.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {view.filters.length} filter
                          {view.filters.length !== 1 ? 's' : ''}
                        </Text>
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
                  </Box>
                </SwipeableRow>
              ))}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* FAB for create */}
      <FAB icon={Plus} label="New view" onClick={handleCreate} />

      {/* Action Sheet */}
      <ActionSheet
        opened={!!actionSheetView}
        onClose={() => setActionSheetView(null)}
        title={actionSheetView?.name ?? 'View Actions'}
        actions={actionSheetActions}
      />
    </Stack>
  );
}
