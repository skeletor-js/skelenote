/**
 * Mobile-optimized Type Browse View
 * Features: list of all object types with counts, tap to drill into type
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
import { Search, ChevronRight } from 'lucide-react';
import { useObjects, useNavigation, useTypeRegistry } from '@/contexts';
import { MobileViewHeader, PullToRefresh } from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { getIconFromEmoji, type IconName } from '@/lib/icons';

interface TypeWithCount {
  id: string;
  name: string;
  icon: string;
  count: number;
  isBuiltIn: boolean;
}

export function MobileTypeBrowseView() {
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
