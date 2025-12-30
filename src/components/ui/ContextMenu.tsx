import { useEffect, useRef, useState, useCallback } from 'react';
import { Menu, Portal, Box } from '@mantine/core';
import { Icon } from './Icon';
import type { IconName } from '@/lib/icons';
import { EMOJI_TO_ICON } from '@/lib/icons';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string; // Can be emoji or icon name
  variant?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Render icon from emoji or icon name
 */
function MenuItemIcon({ icon }: { icon: string }) {
  // Check if it's a known emoji, convert to icon name
  const iconName = EMOJI_TO_ICON[icon];
  if (iconName) {
    return <Icon name={iconName} size={14} />;
  }

  // Check if it's already a valid icon name (no emoji characters)
  const isIconName = /^[a-z0-9-]+$/.test(icon);
  if (isIconName) {
    return <Icon name={icon as IconName} size={14} />;
  }

  // Fallback: render as text (legacy emoji)
  return <span style={{ fontSize: 14 }}>{icon}</span>;
}

/**
 * Context menu using Mantine Menu with portal positioning
 */
export function ContextMenu({ items, position, isOpen, onClose }: ContextMenuProps) {
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  const adjustPosition = useCallback(() => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position if menu would overflow right edge
    if (position.x + rect.width > viewportWidth - 8) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (position.y + rect.height > viewportHeight - 8) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    // Ensure menu doesn't go off left/top edges
    adjustedX = Math.max(8, adjustedX);
    adjustedY = Math.max(8, adjustedY);

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [position]);

  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure the dropdown is rendered
      requestAnimationFrame(adjustPosition);
    }
  }, [isOpen, adjustPosition]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box
        style={{
          position: 'fixed',
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 1000,
        }}
      >
        <Menu
          opened={isOpen}
          onClose={onClose}
          withinPortal={false}
          position="bottom-start"
          offset={0}
          shadow="md"
        >
          <Menu.Dropdown ref={dropdownRef}>
            {items.map((item) => (
              <Menu.Item
                key={item.id}
                leftSection={item.icon && <MenuItemIcon icon={item.icon} />}
                color={item.variant === 'danger' ? 'red' : undefined}
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Portal>
  );
}
