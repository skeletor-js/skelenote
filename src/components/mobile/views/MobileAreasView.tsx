/**
 * Mobile-optimized Areas View
 * Features: list of areas with object counts, search, header button for create
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
  Menu,
  ActionIcon,
} from '@mantine/core';
import {
  Layers,
  Search,
  ChevronRight,
  Pencil,
  Archive,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  Hash,
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

interface AreaWithCounts extends SkelenoteObject {
  objectCount: number;
  projectCount: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'updated' | 'items';

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: typeof ArrowDownAZ;
}[] = [
  { value: 'name-asc', label: 'Name (A-Z)', icon: ArrowDownAZ },
  { value: 'name-desc', label: 'Name (Z-A)', icon: ArrowUpAZ },
  { value: 'updated', label: 'Recently Updated', icon: Clock },
  { value: 'items', label: 'Most Items', icon: Hash },
];

export function MobileAreasView() {
  const { store, isLoading, dataVersion, refreshData } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();
  const { confirm } = useConfirmDialog();
  const reduceMotion = useReducedMotion();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

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

    return areasWithCounts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Filter and sort areas
  const filteredAreas = useMemo(() => {
    let result = areas;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((area) => {
        const name = (area.properties.name ?? '') as string;
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
        case 'items':
          return b.objectCount - a.objectCount;
        default:
          return 0;
      }
    });
  }, [areas, searchQuery, sortBy]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

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

  // Handle edit area - navigate to detail view
  const handleEditArea = useCallback(
    (area: SkelenoteObject) => {
      navigateToObject(area.id);
    },
    [navigateToObject]
  );

  // Handle archive area with confirmation
  const handleArchiveArea = useCallback(
    async (area: SkelenoteObject) => {
      const name = (area.properties.name ?? 'Untitled') as string;

      const confirmed = await confirm({
        title: 'Archive Area',
        message: `Are you sure you want to archive "${name}"? You can restore it later from the Archive.`,
        confirmLabel: 'Archive',
        cancelLabel: 'Cancel',
        variant: 'warning',
      });

      if (confirmed && store) {
        store.archive(area.id);
        refreshData();
      }
    },
    [confirm, store, refreshData]
  );

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
        rightSection={
          <HeaderAddButton label="New area" onClick={handleCreateArea} />
        }
      />

      {/* Search bar with sort */}
      {areas.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Search areas..."
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
          {filteredAreas.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={
                areas.length === 0
                  ? 'No areas yet'
                  : 'No areas match your search'
              }
              description={
                areas.length === 0
                  ? 'Create areas to organize your projects and tasks'
                  : 'Try adjusting your search terms'
              }
              actionLabel={areas.length === 0 ? 'Create area' : undefined}
              onAction={areas.length === 0 ? handleCreateArea : undefined}
            />
          ) : (
            // Area list with AnimatePresence for smooth add/remove
            <Stack gap={0}>
              <AnimatePresence initial={false}>
                {filteredAreas.map((area) => {
                  const name = (area.properties.name ?? 'Untitled') as string;

                  return (
                    <motion.div
                      key={area.id}
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
                            onAction: () => handleEditArea(area),
                          },
                        ]}
                        rightActions={[
                          {
                            id: 'archive',
                            icon: Archive,
                            color: 'gray',
                            label: 'Archive',
                            onAction: () => handleArchiveArea(area),
                          },
                        ]}
                        onPress={() => handleAreaPress(area)}
                        minHeight={64}
                      >
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
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
                              {area.objectCount > 0 &&
                                area.projectCount === 0 && (
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
