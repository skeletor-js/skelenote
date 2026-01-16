/**
 * Mobile-optimized Tags View
 * Features: list of tags with usage counts, search, header add button for create
 */

import { useMemo, useCallback, useState } from 'react';
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
  Menu,
  ActionIcon,
} from '@mantine/core';
import {
  Tag as TagIcon,
  Search,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useObjects, useNavigation } from '@/contexts';
import { useConfirmDialog, useReducedMotion } from '@/hooks';
import { listItem } from '@/lib/animations';
import {
  MobileViewHeader,
  PullToRefresh,
  HeaderAddButton,
  SwipeableRow,
  EmptyState,
} from '../primitives';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import type { TagColor } from '@/lib/types/built-in-types';

interface TagWithCount extends SkelenoteObject {
  usageCount: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'updated' | 'usage';

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: typeof ArrowDownAZ;
}[] = [
  { value: 'name-asc', label: 'Name (A-Z)', icon: ArrowDownAZ },
  { value: 'name-desc', label: 'Name (Z-A)', icon: ArrowUpAZ },
  { value: 'updated', label: 'Recently Updated', icon: Clock },
  { value: 'usage', label: 'Most Used', icon: TrendingUp },
];

export function MobileTagsView() {
  const { store, isLoading, dataVersion, refreshData } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();
  const { confirm } = useConfirmDialog();
  const reduceMotion = useReducedMotion();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('usage');

  // Get tags with usage counts
  const tags = useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const tagObjects = allObjects.filter(
      (obj) => obj.typeId === BuiltInTypeIds.TAG
    );

    // Calculate usage counts for each tag
    const tagsWithCounts: TagWithCount[] = tagObjects.map((tag) => {
      const usageCount = allObjects.filter((obj) => {
        const objTags = obj.properties.tags as string[] | null;
        return objTags?.includes(tag.id);
      }).length;

      return {
        ...tag,
        usageCount,
      };
    });

    return tagsWithCounts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    let result = tags;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((tag) => {
        const name = (tag.properties.name ?? '') as string;
        return name.toLowerCase().includes(query);
      });
    }

    // Apply sorting
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': {
          const nameA = (a.properties.name ?? '') as string;
          const nameB = (b.properties.name ?? '') as string;
          return nameA.localeCompare(nameB);
        }
        case 'name-desc': {
          const nameA = (a.properties.name ?? '') as string;
          const nameB = (b.properties.name ?? '') as string;
          return nameB.localeCompare(nameA);
        }
        case 'updated':
          return b.updatedAt - a.updatedAt;
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return 0;
      }
    });
  }, [tags, searchQuery, sortBy]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

  // Handle tag tap - navigate to tag detail view
  const handleTagPress = useCallback(
    (tagId: string) => {
      navigateToObject(tagId);
    },
    [navigateToObject]
  );

  // Handle create tag
  const handleCreateTag = useCallback(() => {
    // TODO: Open quick create sheet for tags
  }, []);

  // Handle edit tag - navigate to detail view
  const handleEditTag = useCallback(
    (tag: SkelenoteObject) => {
      navigateToObject(tag.id);
    },
    [navigateToObject]
  );

  // Handle delete tag with confirmation
  const handleDeleteTag = useCallback(
    async (tag: SkelenoteObject) => {
      const name = (tag.properties.name ?? 'Untitled') as string;

      const confirmed = await confirm({
        title: 'Delete Tag',
        message: `Are you sure you want to delete "${name}"? This will remove the tag from all items. This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (confirmed && store) {
        store.delete(tag.id);
        refreshData();
      }
    },
    [confirm, store, refreshData]
  );

  // Get tag color
  const getTagColor = (color: TagColor | undefined): string => {
    return color || 'gray';
  };

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Tags"
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
        title="Tags"
        count={tags.length > 0 ? tags.length : undefined}
        showBack
        onBack={() => navigateToView('browse')}
        rightSection={
          <HeaderAddButton label="New tag" onClick={handleCreateTag} />
        }
      />

      {/* Search bar with sort */}
      {tags.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Search tags..."
              leftSection={<Search size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
              style={{ flex: 1 }}
            />
            <Menu shadow="md" width={180} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Sort options"
                >
                  <ArrowUpDown size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Sort by</Menu.Label>
                {SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Menu.Item
                      key={option.value}
                      leftSection={<Icon size={16} />}
                      onClick={() => setSortBy(option.value)}
                      style={{
                        backgroundColor:
                          sortBy === option.value
                            ? 'var(--mantine-color-ember-0)'
                            : undefined,
                      }}
                    >
                      {option.label}
                    </Menu.Item>
                  );
                })}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredTags.length === 0 ? (
            <EmptyState
              icon={TagIcon}
              title={
                tags.length === 0 ? 'No tags yet' : 'No tags match your search'
              }
              description={
                tags.length === 0
                  ? 'Create tags to organize your objects'
                  : 'Try adjusting your search terms'
              }
              actionLabel={tags.length === 0 ? 'Create tag' : undefined}
              onAction={tags.length === 0 ? handleCreateTag : undefined}
            />
          ) : (
            // Tag list with AnimatePresence for smooth add/remove
            <Stack gap={0}>
              <AnimatePresence initial={false}>
                {filteredTags.map((tag) => {
                  const name = (tag.properties.name ?? 'Untitled') as string;
                  const color = tag.properties.color as TagColor | undefined;

                  return (
                    <motion.div
                      key={tag.id}
                      variants={reduceMotion ? undefined : listItem}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      style={{ overflow: 'hidden' }}
                    >
                      <SwipeableRow
                        leftActions={[
                          {
                            id: 'edit',
                            icon: Pencil,
                            color: 'sage',
                            label: 'Edit',
                            onAction: () => handleEditTag(tag),
                          },
                        ]}
                        rightActions={[
                          {
                            id: 'delete',
                            icon: Trash2,
                            color: 'brick',
                            label: 'Delete',
                            onAction: () => handleDeleteTag(tag),
                          },
                        ]}
                        onPress={() => handleTagPress(tag.id)}
                        minHeight={56}
                      >
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                          {/* Colored tag badge */}
                          <Badge
                            size="lg"
                            variant="light"
                            color={getTagColor(color)}
                            leftSection={<TagIcon size={12} />}
                          >
                            {name}
                          </Badge>

                          {/* Spacer */}
                          <Box style={{ flex: 1 }} />

                          {/* Usage count */}
                          {tag.usageCount > 0 && (
                            <Text size="xs" c="dimmed">
                              {tag.usageCount} item
                              {tag.usageCount !== 1 ? 's' : ''}
                            </Text>
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
                      </SwipeableRow>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </Stack>
          )}
        </Box>
      </PullToRefresh>
    </Stack>
  );
}
