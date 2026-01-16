import { type ReactNode } from 'react';
import { Box } from '@mantine/core';
import { BottomTabBar } from './BottomTabBar';

interface MobileLayoutProps {
  children: ReactNode;
}

/**
 * Mobile-optimized layout with bottom tab navigation.
 * Used on iOS and Android instead of the desktop Layout with sidebar.
 */
export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <Box
      style={{
        // Use fixed positioning for reliable full-screen on iOS
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface-canvas)',
        overflow: 'hidden',
      }}
    >
      {/* Main content area */}
      <Box
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        {children}
      </Box>

      {/* Bottom tab bar - flex child at bottom */}
      <BottomTabBar />
    </Box>
  );
}
