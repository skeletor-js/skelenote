import { useMemo, useState, useCallback } from 'react';
import { Stack, Divider, Button, Menu, Group, ActionIcon, Text, ScrollArea, Box, NavLink } from '@mantine/core';
import { Settings, Moon, Sun, ChevronLeft, Plus } from 'lucide-react';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { PinnedSection } from './PinnedSection';
import { SavedViewsSection } from './SavedViewsSection';
import { Tag, type TagColor, SyncIndicator } from '@/components/ui';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useSidebar, useNavigation, useObjects, useTypeRegistry, type ViewType } from '@/contexts';
import { useTheme, useLinkToDaily } from '@/hooks';
import { BuiltInTypeIds, type PropertyValue, type SavedView } from '@/lib/types';

// Default properties for each type when creating
const defaultPropertiesForType: Record<string, Record<string, PropertyValue>> = {
  [BuiltInTypeIds.TASK]: { title: 'New Task', status: 'todo', priority: 'medium' },
  [BuiltInTypeIds.NOTE]: { title: 'New Note' },
  [BuiltInTypeIds.PROJECT]: { name: 'New Project', status: 'active' },
  [BuiltInTypeIds.LINK]: { url: 'https://', title: 'New Link' },
  [BuiltInTypeIds.MEETING]: { title: 'New Meeting', startTime: Date.now() },
  [BuiltInTypeIds.TAG]: { name: 'new-tag' },
  [BuiltInTypeIds.PERSON]: { name: 'New Person' },
};

interface SidebarProps {
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
}

export function Sidebar({ inboxCount = 0, onCreateFromTemplate }: SidebarProps) {
  const { isCollapsed, toggleCollapsed, selectedItem, setSelectedItem } = useSidebar();
  const { navigateToView, navigateToObject, navigateToSavedView, activeSavedViewId } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { theme, toggleTheme } = useTheme();
  const { linkToDaily } = useLinkToDaily();

  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Handle saved view selection
  const handleSavedViewSelect = useCallback(
    (view: SavedView) => {
      navigateToSavedView(view.id);
    },
    [navigateToSavedView]
  );

  // Get all available types for the selector
  const availableTypes = useMemo(() => {
    return typeRegistry.getAll().map((typeDef) => ({
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
        setShowTypeSelector(false);
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
      setShowTypeSelector(false);
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

  const handleNavigate = (view: ViewType) => {
    navigateToView(view);
  };

  // Render icon - either as Lucide icon name or emoji fallback
  const renderTypeIcon = (icon: string) => {
    if (/^[a-z-]+$/.test(icon)) {
      return <Icon name={icon as IconName} size={16} />;
    }
    return <span style={{ fontSize: 14 }}>{icon}</span>;
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <Box
      component="aside"
      style={{
        width: 260,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <ScrollArea flex={1} p="xs">
        <Stack gap={0}>
          {/* Primary navigation */}
          <SidebarItem
            id="inbox"
            icon="inbox"
            label="Inbox"
            count={inboxCount}
            onClick={() => handleNavigate('inbox')}
          />
          <SidebarItem
            id="search"
            icon="search"
            label="Search"
            onClick={() => handleNavigate('search')}
          />
          <SidebarItem
            id="time-machine"
            icon="history"
            label="Time Machine"
            onClick={() => handleNavigate('time-machine')}
          />

          <Divider my="xs" />

          {/* Quick access */}
          <SidebarItem
            id="today"
            icon="calendar"
            label="Today"
            onClick={() => handleNavigate('today')}
          />
          <SidebarItem
            id="daily-notes"
            icon="calendar-days"
            label="Daily Notes"
            onClick={() => handleNavigate('daily-notes')}
          />

          <Divider my="xs" />

          {/* Saved views section */}
          <SavedViewsSection
            onViewSelect={handleSavedViewSelect}
            activeViewId={activeSavedViewId}
          />

          {/* Pinned section */}
          <PinnedSection />

          {/* Tasks section */}
          <SidebarSection id="tasks" title="Tasks">
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

          {/* Projects section */}
          <SidebarSection id="projects" title="Projects">
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
          <SidebarSection id="tags" title="Tags">
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
                    label={<Tag name={tag.name} color={tag.color} size="sm" />}
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
        </Stack>
      </ScrollArea>

      {/* Add Object button */}
      <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Menu opened={showTypeSelector} onChange={setShowTypeSelector} position="top-start" width={200}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              leftSection={<Plus size={16} />}
            >
              Add Object
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {availableTypes.map((type) => (
              <Menu.Item
                key={type.id}
                leftSection={renderTypeIcon(type.icon)}
                onClick={() => handleCreateObject(type.id)}
              >
                {type.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Box>

      {/* Footer with controls */}
      <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Group justify="space-between">
          <SyncIndicator />

          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => handleNavigate('settings')}
              aria-label="Settings"
            >
              <Settings size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>
    </Box>
  );
}
