import { useState, useRef, useEffect, type ReactNode } from 'react';
import { AppShell, Box } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { TopNavBar, type OmnibarFocusFunctions } from './TopNavBar';
import { usePlatform } from '@/hooks';
import { useNavigation } from '@/contexts/NavigationContext';

// Layout dimensions per style guide
const SIDEBAR_WIDTH = 240;

interface LayoutProps {
  children: ReactNode;
  inboxCount?: number;
  onCreateFromTemplate?: () => void;
  onOpenShortcuts?: () => void;
  onNewTemplate?: () => void;
  /** Callback to register the omnibar focus functions for global shortcuts */
  onRegisterOmnibarFocus?: (fns: OmnibarFocusFunctions) => void;
}

export function Layout({
  children,
  inboxCount = 0,
  onCreateFromTemplate,
  onOpenShortcuts,
  onNewTemplate,
  onRegisterOmnibarFocus,
}: LayoutProps) {
  const { windowControlsHeight } = usePlatform();
  const { currentView } = useNavigation();
  const [isZenMode, setIsZenMode] = useState(false);

  // Track sidebar state before entering settings
  const previousZenModeRef = useRef<boolean | null>(null);
  const wasInSettingsRef = useRef(false);

  // Header height should accommodate window controls
  const headerHeight = Math.max(48, windowControlsHeight + 16);

  const toggleZenMode = () => setIsZenMode((prev) => !prev);

  // Auto-hide sidebar when entering settings, restore when leaving
  useEffect(() => {
    const isInSettings = currentView === 'settings';

    if (isInSettings && !wasInSettingsRef.current) {
      // Entering settings - save current state and hide sidebar
      previousZenModeRef.current = isZenMode;
      setIsZenMode(true);
    } else if (!isInSettings && wasInSettingsRef.current) {
      // Leaving settings - restore previous state
      if (previousZenModeRef.current !== null) {
        setIsZenMode(previousZenModeRef.current);
        previousZenModeRef.current = null;
      }
    }

    wasInSettingsRef.current = isInSettings;
  }, [currentView, isZenMode]);

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
          // Use Canvas for main content - warm off-white like paper
          // Pure white (--surface-paper) is reserved for elevated surfaces
          backgroundColor: 'var(--surface-canvas)',
        }}
      >
        <Box style={{ flex: 1, overflow: 'auto' }}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
