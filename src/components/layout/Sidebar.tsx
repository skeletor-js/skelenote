import { useMemo, useCallback } from 'react';
import { Stack, Divider, ActionIcon, Text, ScrollArea, Box, NavLink } from '@mantine/core';
import { Plus } from 'lucide-react';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { PinnedSection } from './PinnedSection';
import { SavedViewsSection } from './SavedViewsSection';
import { ObjectsSection } from './ObjectsSection';
import { type TagColor } from '@/components/ui';
import { useSidebar, useNavigation, useObjects, useTypeRegistry, type ViewType } from '@/contexts';
import { useLinkToDaily } from '@/hooks';
import { BuiltInTypeIds, type PropertyValue, type SavedView } from '@/lib/types';

// Default properties for each type when creating
const defaultPropertiesForType: Record<string, Record<string, PropertyValue>> = {
  [BuiltInTypeIds.TASK]: { title: 'New Task', status: 'todo', priority: 'medium' },
  [BuiltInTypeIds.NOTE]: { title: 'New Note' },
  [BuiltInTypeIds.PROJECT]: { name: 'New Project', status: 'active' },
  [BuiltInTypeIds.AREA]: { name: 'New Area' },
  [BuiltInTypeIds.LINK]: { url: 'https://', title: 'New Link' },
  [BuiltInTypeIds.MEETING]: { title: 'New Meeting', startTime: Date.now(), durationMinutes: '60' },
  [BuiltInTypeIds.TAG]: { name: 'new-tag' },
  [BuiltInTypeIds.PERSON]: { name: 'New Person' },
};

interface SidebarProps {
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
}

export function Sidebar({ inboxCount = 0, onCreateFromTemplate }: SidebarProps) {
  const { selectedItem, setSelectedItem } = useSidebar();
  const { navigateToView, navigateToObject, navigateToSavedView, activeSavedViewId } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { linkToDaily } = useLinkToDaily();

  // Handle saved view selection
  const handleSavedViewSelect = useCallback(
    (view: SavedView) => {
      navigateToSavedView(view.id);
    },
    [navigateToSavedView]
  );

  // Types to exclude from the Add Object menu (these have dedicated creation methods)
  const excludedFromAddMenu: string[] = [
    BuiltInTypeIds.PROJECT,
    BuiltInTypeIds.AREA,
    BuiltInTypeIds.TAG,
    BuiltInTypeIds.TEMPLATE,
  ];

  // Get available types for the selector (excluding types with dedicated creation methods)
  const availableTypes = useMemo(() => {
    return typeRegistry
      .getAll()
      .filter((typeDef) => !excludedFromAddMenu.includes(typeDef.id))
      .map((typeDef) => ({
        id: typeDef.id,
        name: typeDef.name,
        icon: typeDef.icon,
      }));
  }, [typeRegistry]);

  // Handle creating a new object of the selected type
  const handleCreateObject = useCallback(
    (typeId: string) => {
      // Special handling for template type - open template picker
      if (typeId === BuiltInTypeIds.TEMPLATE) {
        onCreateFromTemplate?.();
        return;
      }

      if (!store) return;

      const defaultProps = defaultPropertiesForType[typeId] || {};
      const newObject = store.create({
        typeId,
        properties: defaultProps,
      });

      // Link to today's daily note
      linkToDaily(newObject);

      refreshData();
      navigateToObject(newObject.id);
    },
    [store, linkToDaily, refreshData, navigateToObject, onCreateFromTemplate]
  );

  // Get real projects from the store
  const projects = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.PROJECT).map((obj) => ({
      id: obj.id,
      name: (obj.properties.name as string) || 'Untitled Project',
    }));
  }, [store]);

  // Get real tags from the store
  const tags = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.TAG).map((obj) => ({
      id: obj.id,
      name: (obj.properties.name as string) || 'Untitled',
      color: (obj.properties.color as TagColor) || undefined,
    }));
  }, [store]);

  // Get real areas from the store
  const areas = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.AREA).map((obj) => ({
      id: obj.id,
      name: (obj.properties.name as string) || 'Untitled Area',
    }));
  }, [store]);

  const handleNavigate = (view: ViewType) => {
    navigateToView(view);
  };

  return (
    <Box
      component="aside"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Sidebar uses slightly darker warm tone - "bi-fold notebook" cover
        backgroundColor: 'var(--surface-sidebar)',
      }}
    >
      {/* Content wrapper with right border */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-default)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Primary navigation - always visible at top */}
        <Box p="xs" pb={0}>
          <Stack gap={0}>
            <SidebarItem
              id="inbox"
              icon="inbox"
              label="Inbox"
              count={inboxCount}
              onClick={() => handleNavigate('inbox')}
            />
            <SidebarItem
              id="daily-notes"
              icon="calendar-days"
              label="Daily Notes"
              onClick={() => handleNavigate('daily-notes')}
            />
            <SidebarItem
              id="archive"
              icon="archive"
              label="Archive"
              onClick={() => handleNavigate('archive')}
            />
          </Stack>
          <Divider my="xs" />
        </Box>

        {/* Scrollable sections */}
        <ScrollArea flex={1} px="xs" pb="xs" scrollbarSize={0} type="scroll">
          <Stack gap={0}>
            {/* Pinned section */}
            <PinnedSection />

            {/* Objects section */}
            <ObjectsSection
              availableTypes={availableTypes}
              onCreateObject={handleCreateObject}
            />

            {/* Tasks section */}
            <SidebarSection
              id="tasks"
              title="Tasks"
              action={
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => handleCreateObject(BuiltInTypeIds.TASK)}
                  aria-label="Create new task"
                  title="Create new task"
                >
                  <Plus size={14} />
                </ActionIcon>
              }
            >
              <SidebarItem
                id="today"
                label="Today"
                onClick={() => handleNavigate('today')}
              />
              <SidebarItem
                id="this-week"
                label="This Week"
                onClick={() => handleNavigate('this-week')}
              />
              <SidebarItem
                id="overdue"
                label="Overdue"
                onClick={() => handleNavigate('overdue')}
              />
              <SidebarItem
                id="blocked"
                label="Blocked"
                onClick={() => handleNavigate('blocked')}
              />
              <SidebarItem
                id="eventually"
                label="Eventually"
                onClick={() => handleNavigate('eventually')}
              />
              <SidebarItem
                id="completed"
                label="Completed"
                onClick={() => handleNavigate('completed')}
              />
            </SidebarSection>

            {/* Areas section (PARA) */}
            <SidebarSection
              id="areas"
              title="Areas"
              action={
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => handleCreateObject(BuiltInTypeIds.AREA)}
                  aria-label="Create new area"
                  title="Create new area"
                >
                  <Plus size={14} />
                </ActionIcon>
              }
            >
              {areas.length === 0 ? (
                <Text size="xs" c="dimmed" py="xs" pl="md">
                  No areas yet
                </Text>
              ) : (
                areas.map((area) => (
                  <SidebarItem
                    key={area.id}
                    id={`area-${area.id}`}
                    label={area.name}
                    onClick={() => navigateToObject(area.id)}
                  />
                ))
              )}
            </SidebarSection>

            {/* Projects section */}
            <SidebarSection
              id="projects"
              title="Projects"
              action={
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => handleCreateObject(BuiltInTypeIds.PROJECT)}
                  aria-label="Create new project"
                  title="Create new project"
                >
                  <Plus size={14} />
                </ActionIcon>
              }
            >
              {projects.length === 0 ? (
                <Text size="xs" c="dimmed" py="xs" pl="md">
                  No projects yet
                </Text>
              ) : (
                projects.map((project) => (
                  <SidebarItem
                    key={project.id}
                    id={`project-${project.id}`}
                    label={project.name}
                    onClick={() => navigateToObject(project.id)}
                  />
                ))
              )}
            </SidebarSection>

            {/* Tags section */}
            <SidebarSection
              id="tags"
              title="Tags"
              action={
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => handleCreateObject(BuiltInTypeIds.TAG)}
                  aria-label="Create new tag"
                  title="Create new tag"
                >
                  <Plus size={14} />
                </ActionIcon>
              }
            >
              {tags.length === 0 ? (
                <Text size="xs" c="dimmed" py="xs" pl="md">
                  No tags yet
                </Text>
              ) : (
                tags.map((tag) => {
                  const tagItemId = `tag-${tag.id}`;
                  const isSelected = selectedItem === tagItemId;
                  return (
                    <NavLink
                      key={tag.id}
                      label={`#${tag.name}`}
                      leftSection={
                        <Box
                          component="span"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: tag.color ? `var(--mantine-color-${tag.color}-5)` : 'var(--mantine-color-gray-5)',
                          }}
                        />
                      }
                      active={isSelected}
                      onClick={() => {
                        setSelectedItem(tagItemId);
                        navigateToObject(tag.id);
                      }}
                      variant="subtle"
                    />
                  );
                })
              )}
            </SidebarSection>

            {/* Saved views section */}
            <SavedViewsSection
              onViewSelect={handleSavedViewSelect}
              activeViewId={activeSavedViewId}
            />
          </Stack>
        </ScrollArea>
      </Box>
    </Box>
  );
}
