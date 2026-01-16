/**
 * CascadingRelationSheet - Mobile sheet for area/project with cascading logic
 *
 * Handles the relationship between area and project properties:
 * - When project is selected: auto-update area from project's area
 * - When area is selected first: filter projects to only show those in that area
 * - Cannot clear area while project is set
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  TextInput,
  Text,
  UnstyledButton,
  Box,
  Divider,
  Badge,
  Alert,
  Group,
} from '@mantine/core';
import { Search, Check, X, AlertCircle, FolderKanban, Map } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { useObjects, useTypeRegistry } from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import { getIconFromEmoji, type IconName } from '@/lib/icons';
import type { SkelenoteObject, PropertyValue } from '@/lib/types';

interface CascadingRelationSheetProps {
  opened: boolean;
  onClose: () => void;
  object: SkelenoteObject;
  onPropertyChange: (propertyId: string, value: PropertyValue) => void;
}

type ActivePicker = 'area' | 'project' | null;

export function CascadingRelationSheet({
  opened,
  onClose,
  object,
  onPropertyChange,
}: CascadingRelationSheetProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [searchQuery, setSearchQuery] = useState('');
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // Get current area and project values from the object
  const currentAreaId = useMemo(() => {
    const areaValue = object.properties.area;
    if (Array.isArray(areaValue) && areaValue.length > 0) {
      return areaValue[0] as string;
    }
    return null;
  }, [object.properties.area]);

  const currentProjectId = useMemo(() => {
    const projectValue = object.properties.project;
    if (Array.isArray(projectValue) && projectValue.length > 0) {
      return projectValue[0] as string;
    }
    return null;
  }, [object.properties.project]);

  // Get current area/project objects for display
  const currentArea = useMemo(
    () => (currentAreaId && store ? (store.get(currentAreaId) ?? null) : null),
    [currentAreaId, store]
  );

  const currentProject = useMemo(
    () =>
      currentProjectId && store ? (store.get(currentProjectId) ?? null) : null,
    [currentProjectId, store]
  );

  // Get all areas and projects
  const areas = useMemo(
    () => (store ? store.getByType(BuiltInTypeIds.AREA) : []),
    [store]
  );

  const allProjects = useMemo(
    () => (store ? store.getByType(BuiltInTypeIds.PROJECT) : []),
    [store]
  );

  // Filter projects by current area
  const filteredProjects = useMemo(() => {
    if (!currentAreaId) return allProjects;
    return allProjects.filter((project) => {
      const projectAreaValue = project.properties.area;
      if (Array.isArray(projectAreaValue) && projectAreaValue.length > 0) {
        return projectAreaValue[0] === currentAreaId;
      }
      return false;
    });
  }, [allProjects, currentAreaId]);

  // Filter by search query
  const filteredItems = useMemo(() => {
    const items = activePicker === 'area' ? areas : filteredProjects;
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((obj) => {
      const title = (obj.properties.title ??
        obj.properties.name ??
        '') as string;
      return title.toLowerCase().includes(query);
    });
  }, [activePicker, areas, filteredProjects, searchQuery]);

  // Handle area change
  const handleAreaChange = useCallback(
    (areaId: string | null) => {
      if (!areaId && currentProjectId !== null) {
        // Can't clear area while project is set
        return;
      }

      onPropertyChange('area', areaId ? [areaId] : null);

      // If clearing area, also clear project
      if (!areaId && currentProjectId) {
        onPropertyChange('project', null);
      }

      setActivePicker(null);
      setSearchQuery('');
    },
    [currentProjectId, onPropertyChange]
  );

  // Handle project change with area auto-population
  const handleProjectChange = useCallback(
    (projectId: string | null) => {
      onPropertyChange('project', projectId ? [projectId] : null);

      // If a project was selected, auto-populate area from project's area
      if (projectId && store) {
        const project = store.get(projectId);
        if (project) {
          const projectAreaValue = project.properties.area;
          if (Array.isArray(projectAreaValue) && projectAreaValue.length > 0) {
            onPropertyChange('area', projectAreaValue);
          }
        }
      }

      setActivePicker(null);
      setSearchQuery('');
    },
    [store, onPropertyChange]
  );

  // Handle selection based on active picker
  const handleSelect = useCallback(
    (objectId: string) => {
      if (activePicker === 'area') {
        handleAreaChange(objectId);
      } else if (activePicker === 'project') {
        handleProjectChange(objectId);
      }
    },
    [activePicker, handleAreaChange, handleProjectChange]
  );

  // Clear selection
  const handleClear = useCallback(
    (type: 'area' | 'project') => {
      if (type === 'area') {
        handleAreaChange(null);
      } else {
        handleProjectChange(null);
      }
    },
    [handleAreaChange, handleProjectChange]
  );

  // Reset state when closed
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setActivePicker(null);
    onClose();
  }, [onClose]);

  // Back to selection mode
  const handleBack = useCallback(() => {
    setSearchQuery('');
    setActivePicker(null);
  }, []);

  const getTitle = (obj: SkelenoteObject | null): string => {
    if (!obj) return 'None';
    return (obj.properties.title ??
      obj.properties.name ??
      'Untitled') as string;
  };

  // Get type icon
  const getTypeIcon = useCallback(
    (typeId: string): IconName => {
      const typeDef = typeRegistry.get(typeId);
      if (typeDef?.icon) {
        return getIconFromEmoji(typeDef.icon);
      }
      return 'file';
    },
    [typeRegistry]
  );

  // Render the selection view (area and project buttons)
  const renderSelectionView = () => (
    <Stack gap="md">
      {/* Area Selection */}
      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500} c="dimmed">
            Area
          </Text>
          {currentAreaId && currentProjectId && (
            <Badge size="xs" variant="light" color="gray">
              Locked by Project
            </Badge>
          )}
        </Group>
        <UnstyledButton
          onClick={() => setActivePicker('area')}
          disabled={!!currentProjectId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            width: '100%',
            borderRadius: 8,
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            opacity: currentProjectId ? 0.6 : 1,
            cursor: currentProjectId ? 'not-allowed' : 'pointer',
          }}
        >
          <Map size={18} style={{ color: 'var(--mantine-color-gray-5)' }} />
          <Text size="sm" style={{ flex: 1 }}>
            {getTitle(currentArea)}
          </Text>
          {currentAreaId && !currentProjectId && (
            <UnstyledButton
              onClick={(e) => {
                e.stopPropagation();
                handleClear('area');
              }}
              style={{
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
            </UnstyledButton>
          )}
        </UnstyledButton>
        {currentProjectId && (
          <Text size="xs" c="dimmed" mt={4}>
            Remove project to change area
          </Text>
        )}
      </Box>

      <Divider />

      {/* Project Selection */}
      <Box>
        <Text size="sm" fw={500} c="dimmed" mb="xs">
          Project
        </Text>
        <UnstyledButton
          onClick={() => setActivePicker('project')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            width: '100%',
            borderRadius: 8,
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <FolderKanban
            size={18}
            style={{ color: 'var(--mantine-color-gray-5)' }}
          />
          <Text size="sm" style={{ flex: 1 }}>
            {getTitle(currentProject)}
          </Text>
          {currentProjectId && (
            <UnstyledButton
              onClick={(e) => {
                e.stopPropagation();
                handleClear('project');
              }}
              style={{
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
            </UnstyledButton>
          )}
        </UnstyledButton>
        {currentAreaId && filteredProjects.length === 0 && (
          <Text size="xs" c="dimmed" mt={4}>
            No projects in this area
          </Text>
        )}
      </Box>

      {/* Info about cascading behavior */}
      <Alert
        variant="light"
        color="clay"
        icon={<AlertCircle size={16} />}
        styles={{
          root: { padding: '12px' },
          icon: { marginRight: 8 },
        }}
      >
        <Text size="xs">
          Selecting a project will automatically set its area.
          {currentAreaId && ' Only projects from the selected area are shown.'}
        </Text>
      </Alert>
    </Stack>
  );

  // Render the picker view (list of areas or projects)
  const renderPickerView = () => {
    const typeName = activePicker === 'area' ? 'Area' : 'Project';
    const items = filteredItems;

    return (
      <Stack gap="md">
        {/* Back button */}
        <UnstyledButton
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
          }}
        >
          <Text size="sm" c="ember">
            ← Back
          </Text>
        </UnstyledButton>

        {/* Search input */}
        <TextInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${typeName.toLowerCase()}s...`}
          leftSection={<Search size={18} />}
          size="md"
          autoFocus
        />

        {/* Results */}
        <Box style={{ maxHeight: 280, overflow: 'auto' }}>
          {items.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <Text c="dimmed">
                No {typeName.toLowerCase()}s
                {searchQuery ? ' found' : ' available'}
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {items.map((obj) => {
                const selected =
                  activePicker === 'area'
                    ? obj.id === currentAreaId
                    : obj.id === currentProjectId;
                const title = getTitle(obj);

                return (
                  <UnstyledButton
                    key={obj.id}
                    onClick={() => handleSelect(obj.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 8,
                      backgroundColor: selected
                        ? 'var(--mantine-color-ember-0)'
                        : 'transparent',
                    }}
                  >
                    {selected && (
                      <Check
                        size={18}
                        style={{ color: 'var(--mantine-color-ember-5)' }}
                      />
                    )}
                    <Icon
                      name={getTypeIcon(obj.typeId)}
                      size={18}
                      style={{
                        color: 'var(--mantine-color-gray-5)',
                        marginLeft: selected ? 0 : 30,
                      }}
                    />
                    <Text size="sm" style={{ flex: 1 }} truncate>
                      {title}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </Box>
      </Stack>
    );
  };

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title={
        activePicker
          ? `Select ${activePicker === 'area' ? 'Area' : 'Project'}`
          : 'Area & Project'
      }
      size="lg"
    >
      {activePicker ? renderPickerView() : renderSelectionView()}
    </BottomSheet>
  );
}
