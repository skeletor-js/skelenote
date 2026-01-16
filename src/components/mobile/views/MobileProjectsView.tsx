/**
 * Mobile-optimized Projects View
 * Features: list of projects with task counts, search, header button for create
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
  Folder,
  Search,
  ChevronRight,
  Pencil,
  Archive,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  ListTodo,
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
import { QuickCreateProjectSheet } from '../sheets';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import type { ProjectStatus } from '@/lib/types/built-in-types';

interface ProjectWithCounts extends SkelenoteObject {
  taskCount: number;
  openTaskCount: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'updated' | 'tasks';

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: typeof ArrowDownAZ;
}[] = [
  { value: 'name-asc', label: 'Name (A-Z)', icon: ArrowDownAZ },
  { value: 'name-desc', label: 'Name (Z-A)', icon: ArrowUpAZ },
  { value: 'updated', label: 'Recently Updated', icon: Clock },
  { value: 'tasks', label: 'Most Tasks', icon: ListTodo },
];

export function MobileProjectsView() {
  const { store, isLoading, dataVersion, refreshData } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();
  const { confirm } = useConfirmDialog();
  const reduceMotion = useReducedMotion();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  // Sheet state
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  // Get projects with task counts
  const projects = useMemo(() => {
    if (!store) return [];

    const allObjects = store.getAll();
    const projectObjects = allObjects.filter(
      (obj) => obj.typeId === BuiltInTypeIds.PROJECT
    );

    // Calculate task counts for each project
    const projectsWithCounts: ProjectWithCounts[] = projectObjects.map(
      (project) => {
        const linkedTasks = allObjects.filter(
          (obj) =>
            obj.typeId === BuiltInTypeIds.TASK &&
            obj.properties.project === project.id
        );
        const openTasks = linkedTasks.filter(
          (task) => task.properties.status !== 'done'
        );

        return {
          ...project,
          taskCount: linkedTasks.length,
          openTaskCount: openTasks.length,
        };
      }
    );

    return projectsWithCounts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((project) => {
        const name = (project.properties.name ?? '') as string;
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
        case 'tasks':
          return b.openTaskCount - a.openTaskCount;
        default:
          return 0;
      }
    });
  }, [projects, searchQuery, sortBy]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    refreshData();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, [refreshData]);

  // Handle project tap - navigate to project detail view
  const handleProjectPress = useCallback(
    (project: SkelenoteObject) => {
      // Navigate to the project object detail view
      navigateToObject(project.id);
    },
    [navigateToObject]
  );

  // Handle create project
  const handleCreateProject = useCallback(() => {
    setCreateSheetOpen(true);
  }, []);

  // Handle edit project - navigate to detail view
  const handleEditProject = useCallback(
    (project: SkelenoteObject) => {
      navigateToObject(project.id);
    },
    [navigateToObject]
  );

  // Handle archive project with confirmation
  const handleArchiveProject = useCallback(
    async (project: SkelenoteObject) => {
      const name = (project.properties.name ?? 'Untitled') as string;

      const confirmed = await confirm({
        title: 'Archive Project',
        message: `Are you sure you want to archive "${name}"? You can restore it later from the Archive.`,
        confirmLabel: 'Archive',
        cancelLabel: 'Cancel',
        variant: 'warning',
      });

      if (confirmed && store) {
        store.update(project.id, {
          properties: { ...project.properties, status: 'archived' },
        });
        refreshData();
      }
    },
    [confirm, store, refreshData]
  );

  // Get status color
  const getStatusColor = (status: ProjectStatus | undefined): string => {
    switch (status) {
      case 'active':
        return 'sage';
      case 'on-hold':
        return 'ochre';
      case 'completed':
        return 'gray';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader
          title="Projects"
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
        title="Projects"
        count={projects.length > 0 ? projects.length : undefined}
        showBack
        onBack={() => navigateToView('browse')}
        rightSection={
          <HeaderAddButton label="New project" onClick={handleCreateProject} />
        }
      />

      {/* Search bar with sort */}
      {projects.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Search projects..."
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
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={
                projects.length === 0
                  ? 'No projects yet'
                  : 'No projects match your search'
              }
              description={
                projects.length === 0
                  ? 'Create your first project to organize tasks'
                  : 'Try adjusting your search terms'
              }
              actionLabel={projects.length === 0 ? 'Create project' : undefined}
              onAction={projects.length === 0 ? handleCreateProject : undefined}
            />
          ) : (
            // Project list with AnimatePresence for smooth add/remove
            <Stack gap={0}>
              <AnimatePresence initial={false}>
                {filteredProjects.map((project) => {
                  const name = (project.properties.name ??
                    'Untitled') as string;
                  const status = project.properties.status as
                    | ProjectStatus
                    | undefined;
                  const statusLabel = status
                    ? status.charAt(0).toUpperCase() +
                      status.slice(1).replace('-', ' ')
                    : null;

                  return (
                    <motion.div
                      key={project.id}
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
                            onAction: () => handleEditProject(project),
                          },
                        ]}
                        rightActions={[
                          {
                            id: 'archive',
                            icon: Archive,
                            color: 'gray',
                            label: 'Archive',
                            onAction: () => handleArchiveProject(project),
                          },
                        ]}
                        onPress={() => handleProjectPress(project)}
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
                            <Folder
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
                              {statusLabel && (
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={getStatusColor(status)}
                                >
                                  {statusLabel}
                                </Badge>
                              )}
                              {project.openTaskCount > 0 && (
                                <Text size="xs" c="dimmed">
                                  {project.openTaskCount} open task
                                  {project.openTaskCount !== 1 ? 's' : ''}
                                </Text>
                              )}
                              {project.openTaskCount === 0 &&
                                project.taskCount > 0 && (
                                  <Text size="xs" c="dimmed">
                                    {project.taskCount} task
                                    {project.taskCount !== 1 ? 's' : ''}{' '}
                                    completed
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

      {/* Quick Create Project Sheet */}
      <QuickCreateProjectSheet
        opened={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      />
    </Stack>
  );
}
