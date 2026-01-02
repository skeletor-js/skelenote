import { useState, useMemo, useCallback } from 'react';
import { ActionIcon, Group, Menu, Tooltip } from '@mantine/core';
import { History, Plus, Moon, Sun, Settings } from 'lucide-react';
import { SyncIndicator } from '@/components/ui';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { useTheme, useLinkToDaily } from '@/hooks';
import { BuiltInTypeIds, type PropertyValue } from '@/lib/types';

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

// Types to exclude from the Add Object menu
const excludedFromAddMenu: string[] = [
  BuiltInTypeIds.PROJECT,
  BuiltInTypeIds.AREA,
  BuiltInTypeIds.TAG,
  BuiltInTypeIds.TEMPLATE,
];

interface TopNavRightControlsProps {
  onOpenQuickCapture?: () => void;
  onCreateFromTemplate?: () => void;
}

/**
 * Right-side controls for the top nav bar.
 * Contains: Time Machine, Add New, Sync Indicator, Theme Toggle, Settings.
 */
export function TopNavRightControls({
  onOpenQuickCapture,
  onCreateFromTemplate,
}: TopNavRightControlsProps) {
  const { navigateToView, navigateToObject, navigateToTimeMachine } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { theme, toggleTheme } = useTheme();
  const { linkToDaily } = useLinkToDaily();
  const [addMenuOpened, setAddMenuOpened] = useState(false);

  // Get available types for the add menu
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

      linkToDaily(newObject);
      refreshData();
      navigateToObject(newObject.id);
    },
    [store, linkToDaily, refreshData, navigateToObject, onCreateFromTemplate]
  );

  // Render icon - either as Lucide icon name or emoji fallback
  const renderTypeIcon = (icon: string) => {
    if (/^[a-z-]+$/.test(icon)) {
      return <Icon name={icon as IconName} size={14} />;
    }
    return <span style={{ fontSize: 12 }}>{icon}</span>;
  };

  return (
    <Group gap="xs">
      {/* Time Machine */}
      <Tooltip label="Time Machine (Cmd+Shift+H)" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => navigateToTimeMachine()}
          aria-label="Time Machine"
        >
          <History size={14} />
        </ActionIcon>
      </Tooltip>

      {/* Add New */}
      <Menu
        opened={addMenuOpened}
        onChange={setAddMenuOpened}
        position="bottom-end"
        width={180}
      >
        <Menu.Target>
          <Tooltip label="Add new object" position="bottom" withArrow disabled={addMenuOpened}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Add new object"
            >
              <Plus size={14} />
            </ActionIcon>
          </Tooltip>
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

      {/* Sync Indicator */}
      <SyncIndicator />

      {/* Theme Toggle */}
      <Tooltip
        label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        position="bottom"
        withArrow
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </ActionIcon>
      </Tooltip>

      {/* Settings */}
      <Tooltip label="Settings" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => navigateToView('settings')}
          aria-label="Settings"
        >
          <Settings size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
