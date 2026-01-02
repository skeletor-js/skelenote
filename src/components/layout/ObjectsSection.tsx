import { useMemo, useCallback, useState } from 'react';
import { Box, Badge, NavLink, Stack, ActionIcon, Menu } from '@mantine/core';
import { ChevronRight, Plus } from 'lucide-react';
import { useSidebar, useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { Icon, type IconName } from '@/components/ui/Icon';
import { BuiltInTypeIds } from '@/lib/types';

/**
 * Types to show in the Objects section
 * Excludes Project, Area, Tag (dedicated sections) and Template (utility)
 */
const BROWSABLE_TYPES = [
  BuiltInTypeIds.TASK,
  BuiltInTypeIds.NOTE,
  BuiltInTypeIds.LINK,
  BuiltInTypeIds.MEETING,
  BuiltInTypeIds.PERSON,
] as const;

interface AvailableType {
  id: string;
  name: string;
  icon: string;
}

interface ObjectsSectionProps {
  availableTypes: AvailableType[];
  onCreateObject: (typeId: string) => void;
}

export function ObjectsSection({ availableTypes, onCreateObject }: ObjectsSectionProps) {
  const { isSectionCollapsed, toggleSection, setSelectedItem } = useSidebar();
  const { navigateToTypeBrowse, browseTypeId, currentView } = useNavigation();
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const [menuOpened, setMenuOpened] = useState(false);

  const isCollapsed = isSectionCollapsed('objects');

  const handleToggle = useCallback(() => {
    toggleSection('objects');
  }, [toggleSection]);

  // Render icon - either as Lucide icon name or emoji fallback
  const renderTypeIcon = (icon: string) => {
    if (/^[a-z-]+$/.test(icon)) {
      return <Icon name={icon as IconName} size={16} />;
    }
    return <span style={{ fontSize: 14 }}>{icon}</span>;
  };

  // Get type definitions with counts
  const typeItems = useMemo(() => {
    return BROWSABLE_TYPES.map((typeId) => {
      const typeDef = typeRegistry.get(typeId);
      const count = store?.getByType(typeId).length ?? 0;
      return {
        id: typeId,
        name: typeDef?.name ?? typeId,
        icon: typeDef?.icon ?? 'file',
        count,
      };
    });
  }, [typeRegistry, store]);

  const handleTypeClick = useCallback(
    (typeId: string) => {
      setSelectedItem(`type-${typeId}`);
      navigateToTypeBrowse(typeId);
    },
    [setSelectedItem, navigateToTypeBrowse]
  );

  return (
    <Box mb="xs">
      <NavLink
        label="Objects"
        leftSection={
          <ChevronRight
            size={14}
            style={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 150ms ease',
            }}
          />
        }
        onClick={handleToggle}
        opened={!isCollapsed}
        rightSection={
          <Menu opened={menuOpened} onChange={setMenuOpened} position="bottom-start" width={180}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpened((o) => !o);
                }}
                aria-label="Create new object"
                title="Create new object"
              >
                <Plus size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {availableTypes.map((type) => (
                <Menu.Item
                  key={type.id}
                  leftSection={renderTypeIcon(type.icon)}
                  onClick={() => onCreateObject(type.id)}
                >
                  {type.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        }
        disableRightSectionRotation
        variant="subtle"
        styles={{
          label: {
            fontWeight: 600,
            fontSize: 'var(--mantine-font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--mantine-color-dimmed)',
          },
        }}
      >
        <Stack gap={0}>
          {typeItems.map((item) => {
            const isSelected =
              currentView === 'type-browse' && browseTypeId === item.id;
            return (
              <NavLink
                key={item.id}
                label={item.name}
                leftSection={<Icon name={item.icon as IconName} size={16} />}
                rightSection={
                  item.count > 0 ? (
                    <Badge size="xs" variant="light" color="gray" radius="sm">
                      {item.count}
                    </Badge>
                  ) : undefined
                }
                active={isSelected}
                onClick={() => handleTypeClick(item.id)}
                variant="subtle"
              />
            );
          })}
        </Stack>
      </NavLink>
    </Box>
  );
}
