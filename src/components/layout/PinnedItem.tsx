/**
 * PinnedItem - A draggable pinned object in the sidebar
 */

import { useCallback } from 'react';
import { NavLink, Menu, Box } from '@mantine/core';
import { GripVertical, Pin } from 'lucide-react';
import { useSidebar, useTypeRegistry, useNavigation } from '@/contexts';
import { useContextMenu, usePinnedObjects } from '@/hooks';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { SkelenoteObject } from '@/lib/types';

interface PinnedItemProps {
  object: SkelenoteObject;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

export function PinnedItem({
  object,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
}: PinnedItemProps) {
  const { selectedItem, setSelectedItem } = useSidebar();
  const { navigateToObject } = useNavigation();
  const typeRegistry = useTypeRegistry();
  const { unpin } = usePinnedObjects();
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();

  // Get type info for icon
  const typeDef = typeRegistry.get(object.typeId);
  const icon = typeDef?.icon ?? 'file';

  // Get display title
  const title =
    (object.properties.title as string) ||
    (object.properties.name as string) ||
    'Untitled';

  const itemId = `pinned-${object.id}`;
  const isSelected = selectedItem === itemId;

  const handleClick = useCallback(() => {
    setSelectedItem(itemId);
    navigateToObject(object.id);
  }, [setSelectedItem, itemId, navigateToObject, object.id]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', object.id);
      onDragStart(index);
    },
    [onDragStart, index, object.id]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      onDragOver(index);
    },
    [onDragOver, index]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  // Render icon - either as Lucide icon name or emoji fallback
  const renderIcon = () => {
    if (/^[a-z-]+$/.test(icon)) {
      return <Icon name={icon as IconName} size={16} />;
    }
    return <span style={{ fontSize: 14 }}>{icon}</span>;
  };

  // Suppress unused variable warning - position is from useContextMenu but Menu handles its own positioning
  void position;

  return (
    <Menu opened={isOpen} onClose={closeContextMenu} position="right-start">
      <Menu.Target>
        <Box
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onContextMenu={openContextMenu}
          style={{
            opacity: isDragging ? 0.5 : 1,
            borderTop: isDragOver ? '2px solid var(--mantine-color-blue-5)' : undefined,
            cursor: 'grab',
          }}
        >
          <NavLink
            label={title}
            leftSection={
              <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <GripVertical size={12} style={{ color: 'var(--mantine-color-dimmed)' }} />
                {renderIcon()}
              </Box>
            }
            active={isSelected}
            onClick={handleClick}
            variant="subtle"
          />
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<Pin size={14} />}
          onClick={() => unpin(object.id)}
        >
          Unpin from Sidebar
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
