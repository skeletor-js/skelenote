import { type ReactNode } from 'react';
import { AppShell, Box } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { TopNavBar } from './TopNavBar';
import { usePlatform } from '@/hooks';

// Layout dimensions per style guide
const SIDEBAR_WIDTH = 240;

interface LayoutProps {
  children: ReactNode;
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
  onQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
  onNewTemplate?: () => void;
}

export function Layout({
  children,
  inboxCount = 0,
  onCreateFromTemplate,
  onQuickCapture,
  onOpenShortcuts,
  onNewTemplate,
}: LayoutProps) {
  const { windowControlsHeight } = usePlatform();

  // Header height should accommodate window controls
  const headerHeight = Math.max(48, windowControlsHeight + 16);

  return (
    <AppShell
      header={{ height: headerHeight }}
      navbar={{
        width: SIDEBAR_WIDTH,
        breakpoint: 'sm',
      }}
      padding={0}
    >
      <AppShell.Header>
        <TopNavBar
          onQuickCapture={onQuickCapture}
          onOpenShortcuts={onOpenShortcuts}
          onCreateFromTemplate={onCreateFromTemplate}
          onNewTemplate={onNewTemplate}
        />
      </AppShell.Header>

      <AppShell.Navbar p={0} withBorder={false}>
        <Sidebar inboxCount={inboxCount} onCreateFromTemplate={onCreateFromTemplate} />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Use paper surface for content area (elevated above canvas sidebar)
          backgroundColor: 'var(--surface-paper)',
        }}
      >
        <Box style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
