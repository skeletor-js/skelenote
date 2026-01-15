/**
 * Mobile-optimized Projects View
 * Features: list of projects with task counts, search, FAB for create
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
import { Folder, Plus, Search, ChevronRight } from 'lucide-react';
import { useObjects, useNavigation } from '@/contexts';
import { MobileViewHeader, PullToRefresh, FAB } from '../primitives';
import { BuiltInTypeIds, type SkelenoteObject } from '@/lib/types';
import type { ProjectStatus } from '@/lib/types/built-in-types';

interface ProjectWithCounts extends SkelenoteObject {
  taskCount: number;
  openTaskCount: number;
}

export function MobileProjectsView() {
  const { store, isLoading, dataVersion } = useObjects();
  const { navigateToView, navigateToObject } = useNavigation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

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

    // Sort by name
    return projectsWithCounts.sort((a, b) => {
      const nameA = (a.properties.name ?? '') as string;
      const nameB = (b.properties.name ?? '') as string;
      return nameA.localeCompare(nameB);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion]);

  // Filter by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((project) => {
      const name = (project.properties.name ?? '') as string;
      return name.toLowerCase().includes(query);
    });
  }, [projects, searchQuery]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

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
    // TODO: Open quick create sheet for projects
  }, []);

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
      />

      {/* Search bar */}
      {projects.length > 0 && (
        <Box
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <TextInput
            placeholder="Search projects..."
            leftSection={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
          />
        </Box>
      )}

      <PullToRefresh onRefresh={handleRefresh}>
        <Box style={{ minHeight: '100%' }}>
          {filteredProjects.length === 0 ? (
            // Empty state
            <Stack
              align="center"
              justify="center"
              gap="lg"
              style={{ paddingTop: 80, paddingBottom: 80 }}
              px="xl"
            >
              <Folder
                size={48}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text size="md" c="dimmed" ta="center">
                {projects.length === 0
                  ? 'No projects yet'
                  : 'No projects match your search'}
              </Text>
            </Stack>
          ) : (
            // Project list
            <Stack gap={0}>
              {filteredProjects.map((project) => {
                const name = (project.properties.name ?? 'Untitled') as string;
                const status = project.properties.status as
                  | ProjectStatus
                  | undefined;
                const statusLabel = status
                  ? status.charAt(0).toUpperCase() +
                    status.slice(1).replace('-', ' ')
                  : null;

                return (
                  <Box
                    key={project.id}
                    onClick={() => handleProjectPress(project)}
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
                                {project.taskCount !== 1 ? 's' : ''} completed
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
      <FAB icon={Plus} label="New project" onClick={handleCreateProject} />
    </Stack>
  );
}
