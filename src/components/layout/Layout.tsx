import { useState, type ReactNode } from 'react';
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
  /** Callback to register the omnibar focus function for global shortcut */
  onRegisterOmnibarFocus?: (focusFn: () => void) => void;
}

export function Layout({
  children,
  inboxCount = 0,
  onCreateFromTemplate,
  onQuickCapture,
  onOpenShortcuts,
  onNewTemplate,
  onRegisterOmnibarFocus,
}: LayoutProps) {
  const { windowControlsHeight } = usePlatform();
  const [isZenMode, setIsZenMode] = useState(false);

  // Header height should accommodate window controls
  const headerHeight = Math.max(48, windowControlsHeight + 16);

  const toggleZenMode = () => setIsZenMode((prev) => !prev);

  return (
    <AppShell
      header={{ height: headerHeight }}
      navbar={{
        width: isZenMode ? 0 : SIDEBAR_WIDTH,
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
          onRegisterOmnibarFocus={onRegisterOmnibarFocus}
          isZenMode={isZenMode}
          onToggleZenMode={toggleZenMode}
        />
      </AppShell.Header>

      {!isZenMode && (
        <AppShell.Navbar p={0} withBorder={false}>
          <Sidebar
            inboxCount={inboxCount}
            onCreateFromTemplate={onCreateFromTemplate}
          />
        </AppShell.Navbar>
      )}

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
