/**
 * Mobile-optimized Areas View
 * Features: list of areas with object counts, search, FAB for create
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
import { Layers, Plus, Search, ChevronRight } from 'lucide-react';
import { useObjects, useNavigation } from '@/contexts';
import { MobileViewHeader, PullToRefresh, FAB } from '../primitives';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';

interface AreaWithCounts extends SkelenoteObject {
  objectCount: number;
  projectCount: number;
}

export function MobileAreasView() {
  const { store, isLoading, dataVersion } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get areas with object counts
  const areas = useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const areaObjects = allObjects.filter(
      (obj) => obj.typeId === BuiltInTypeIds.AREA
    );

    // Calculate counts for each area
    const areasWithCounts: AreaWithCounts[] = areaObjects.map((area) => {
      const linkedObjects = allObjects.filter(
        (obj) => obj.properties.area === area.id
      );
      const linkedProjects = linkedObjects.filter(
        (obj) => obj.typeId === BuiltInTypeIds.PROJECT
      );

      return {
        ...area,
        objectCount: linkedObjects.length,
        projectCount: linkedProjects.length,
      };
    });

    // Sort by name
    return areasWithCounts.sort((a, b) => {
      const nameA = (a.properties.name ?? '') as string;
      const nameB = (b.properties.name ?? '') as string;
      return nameA.localeCompare(nameB);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Filter by search query
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areas;
    const query = searchQuery.toLowerCase();
    return areas.filter((area) => {
      const name = (area.properties.name ?? '') as string;
      return name.toLowerCase().includes(query);
    });
  }, [areas, searchQuery]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Handle area tap - navigate to area detail view
  const handleAreaPress = useCallback(
    (area: SkelenoteObject) => {
      // Navigate to the area object detail view
      navigateToObject(area.id);
    },
    [navigateToObject]
  );

  // Handle create area
  const handleCreateArea = useCallback(() => {
    // TODO: Open quick create sheet for areas
  }, []);

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Areas"
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
        title="Areas"
        count={areas.length > 0 ? areas.length : undefined}
        showBack
        onBack={() => navigateToView('browse')}
      />

      {/* Search bar */}
      {areas.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search areas..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredAreas.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <Layers
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {areas.length === 0
                  ? 'No areas yet'
                  : 'No areas match your search'}
              </Text>
            </Stack>
          ) : (
            // Area list
            <Stack gap={0}>
              {filteredAreas.map((area) => {
                const name = (area.properties.name ?? 'Untitled') as string;

                return (
                  <Box
                    key={area.id}
                    onClick={() => handleAreaPress(area)}
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
                        <Layers
                          size={18}
                          style={{ color: 'var(--mantine-color-gray-7)' }}
                        />
                      </Box>

                      {/* Name and metadata */}
                      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {name}
                        </Text>
                        <Group gap="xs" wrap="nowrap">
                          {area.projectCount > 0 && (
                            <Text size="xs" c="dimmed">
                              {area.projectCount} project
                              {area.projectCount !== 1 ? 's' : ''}
                            </Text>
                          )}
                          {area.objectCount > 0 && area.projectCount === 0 && (
                            <Text size="xs" c="dimmed">
                              {area.objectCount} item
                              {area.objectCount !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </Group>
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
                );
              })}
            </Stack>
          )}
        </Box>
      </PullToRefresh>

      {/* FAB for create */}
      <FAB icon={Plus} label="New area" onClick={handleCreateArea} />
    </Stack>
  );
}
