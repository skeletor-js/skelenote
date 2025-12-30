import { type ReactNode, useEffect } from 'react';
import { AppShell, ActionIcon, Box, Overlay } from '@mantine/core';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useSidebar } from '@/contexts';

interface LayoutProps {
  children: ReactNode;
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
}

export function Layout({ children, inboxCount = 0, onCreateFromTemplate }: LayoutProps) {
  const { isCollapsed, setCollapsed, toggleCollapsed } = useSidebar();

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
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: isCollapsed, desktop: isCollapsed },
      }}
      padding={0}
    >
      <AppShell.Navbar p={0}>
        <Sidebar inboxCount={inboxCount} onCreateFromTemplate={onCreateFromTemplate} />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Show menu button when sidebar is collapsed */}
        {isCollapsed && (
          <Box
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 100,
            }}
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={toggleCollapsed}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </ActionIcon>
          </Box>
        )}

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
