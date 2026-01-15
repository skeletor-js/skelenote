/**
 * Mobile-optimized Tags View
 * Features: list of tags with usage counts, search, FAB for create
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
  Badge,
} from '@mantine/core';
import { Tag as TagIcon, Plus, Search, ChevronRight } from 'lucide-react';
import { useObjects, useNavigation } from '@/contexts';
import { MobileViewHeader, PullToRefresh, FAB } from '../primitives';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import type { TagColor } from '@/lib/types/built-in-types';

interface TagWithCount extends SkelenoteObject {
  usageCount: number;
}

export function MobileTagsView() {
  const { store, isLoading, dataVersion } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

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

    // Sort by usage count (most used first), then by name
    return tagsWithCounts.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      const nameA = (a.properties.name ?? '') as string;
      const nameB = (b.properties.name ?? '') as string;
      return nameA.localeCompare(nameB);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Filter by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => {
      const name = (tag.properties.name ?? '') as string;
      return name.toLowerCase().includes(query);
    });
  }, [tags, searchQuery]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

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
      />

      {/* Search bar */}
      {tags.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search tags..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredTags.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <TagIcon
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {tags.length === 0
                  ? 'No tags yet'
                  : 'No tags match your search'}
              </Text>
            </Stack>
          ) : (
            // Tag list
            <Stack gap={0}>
              {filteredTags.map((tag) => {
                const name = (tag.properties.name ?? 'Untitled') as string;
                const color = tag.properties.color as TagColor | undefined;

                return (
                  <Box
                    key={tag.id}
                    onClick={() => handleTagPress(tag.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--surface-paper)',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
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
                          {tag.usageCount} item{tag.usageCount !== 1 ? 's' : ''}
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
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* FAB for create */}
      <FAB icon={Plus} label="New tag" onClick={handleCreateTag} />
    </Stack>
  );
}
