/**
 * Settings Navigation Item
 *
 * Individual navigation item for the settings sidebar.
 * Based on the SidebarItem pattern but simplified for settings use.
 */

import { NavLink } from '@mantine/core';
import { Icon, type IconName } from '@/components/ui/Icon';

export type SettingsSection =
  | 'account'
  | 'sync'
  | 'appearance'
  | 'templates'
  | 'search'
  | 'privacy'
  | 'data'
  | 'about'
  | 'danger';

interface SettingsNavItemProps {
  id: SettingsSection;
  icon: IconName;
  label: string;
  isActive: boolean;
  onClick: () => void;
  color?: 'brick';
}

export function SettingsNavItem({
  icon,
  label,
  isActive,
  onClick,
  color,
}: SettingsNavItemProps) {
  return (
    <NavLink
      label={label}
      leftSection={<Icon name={icon} size={16} />}
      active={isActive}
      onClick={onClick}
      variant="subtle"
      color={color}
      styles={{
        root: {
          borderRadius: 'var(--mantine-radius-sm)',
          transition: 'background-color 150ms ease',
        },
        label: {
          fontWeight: isActive ? 500 : 400,
        },
      }}
    />
  );
}
