/**
 * Settings View
 *
 * Main settings container with sidebar navigation and panel content.
 * Uses a Linear-style sidebar layout for better organization.
 */

import { useState } from 'react';
import { Group, Box, ScrollArea } from '@mantine/core';
import { ViewHeader } from '@/components/ui';
import { SettingsSidebar } from './SettingsSidebar';
import { type SettingsSection } from './SettingsNavItem';
import {
  AccountSettings,
  SyncSettingsPanel,
  AppearanceSettings,
  TemplateSettingsPanel,
  SearchSettings,
  DataSettings,
  AboutSettings,
  DangerZoneSettings,
} from './panels';

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');

  const renderActivePanel = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />;
      case 'sync':
        return <SyncSettingsPanel />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'templates':
        return <TemplateSettingsPanel />;
      case 'search':
        return <SearchSettings />;
      case 'data':
        return <DataSettings />;
      case 'about':
        return <AboutSettings />;
      case 'danger':
        return <DangerZoneSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <Group gap={0} h="100%" wrap="nowrap" style={{ overflow: 'hidden' }}>
      {/* Header + Sidebar Column */}
      <Box
        w={180}
        h="100%"
        style={{
          borderRight: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <ViewHeader title="Settings" />
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </Box>

      {/* Content Panel */}
      <Box flex={1} h="100%" style={{ overflow: 'hidden' }}>
        <ScrollArea h="100%" p="lg">
          <Box>
            {renderActivePanel()}
          </Box>
        </ScrollArea>
      </Box>
    </Group>
  );
}
