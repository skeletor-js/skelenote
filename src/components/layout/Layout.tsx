import { type ReactNode, useEffect } from 'react';
import { AppShell, Box, Overlay } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { TitleBarSpacer } from './TitleBarSpacer';
import { useSidebar } from '@/contexts';

// Layout dimensions per style guide
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 48;

interface LayoutProps {
  children: ReactNode;
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
}

export function Layout({ children, inboxCount = 0, onCreateFromTemplate }: LayoutProps) {
  const { isCollapsed, setCollapsed } = useSidebar();

  // Handle responsive collapse
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setCollapsed(true);
      }
    };

    // Check initial state
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setCollapsed]);

  return (
    <AppShell
      navbar={{
        width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        breakpoint: 'sm',
      }}
      padding={0}
    >
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
        {/* Title bar spacer for macOS traffic lights */}
        <TitleBarSpacer variant="main" />

        <Box style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </AppShell.Main>

      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <Overlay
          onClick={() => setCollapsed(true)}
          zIndex={99}
          hiddenFrom="sm"
        />
      )}
    </AppShell>
  );
}
