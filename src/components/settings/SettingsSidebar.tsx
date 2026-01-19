/**
 * Settings Sidebar
 *
 * Left navigation sidebar for the settings view.
 * Uses a vertical stack of nav items with a divider before danger zone.
 */

import { Stack, Divider, Box } from '@mantine/core';
import { SettingsNavItem, type SettingsSection } from './SettingsNavItem';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const NAV_ITEMS: Array<{
  id: SettingsSection;
  icon: string;
  label: string;
  color?: 'brick';
}> = [
  { id: 'account', icon: 'user', label: 'Account' },
  { id: 'sync', icon: 'refresh-cw', label: 'Sync' },
  { id: 'appearance', icon: 'palette', label: 'Appearance' },
  { id: 'templates', icon: 'file-text', label: 'Templates' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'privacy', icon: 'shield', label: 'Privacy' },
  { id: 'data', icon: 'download', label: 'Data' },
];

const SECONDARY_NAV_ITEMS: Array<{
  id: SettingsSection;
  icon: string;
  label: string;
  color?: 'brick';
}> = [
  { id: 'about', icon: 'info', label: 'About' },
  {
    id: 'danger',
    icon: 'alert-triangle',
    label: 'Danger Zone',
    color: 'brick',
  },
];

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <Box p="sm" style={{ flex: 1, overflow: 'auto' }}>
      <Stack gap={4}>
        {NAV_ITEMS.map((item) => (
          <SettingsNavItem
            key={item.id}
            id={item.id}
            icon={item.icon as Parameters<typeof SettingsNavItem>[0]['icon']}
            label={item.label}
            isActive={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
          />
        ))}

        <Divider my="sm" />

        {SECONDARY_NAV_ITEMS.map((item) => (
          <SettingsNavItem
            key={item.id}
            id={item.id}
            icon={item.icon as Parameters<typeof SettingsNavItem>[0]['icon']}
            label={item.label}
            isActive={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
            color={item.color}
          />
        ))}
      </Stack>
    </Box>
  );
}
