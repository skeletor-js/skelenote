/**
 * TopNavBar - Main top navigation bar with back/forward, omnibar, and controls
 */

import { useRef, useEffect } from 'react';
import { Box, Group } from '@mantine/core';
import { useNavigation } from '@/contexts';
import { usePlatform } from '@/hooks';
import { NavigationButtons } from './NavigationButtons';
import { Omnibar, type OmnibarRef } from './Omnibar';
import { CreationControls, SystemControls } from './TopNavRightControls';
import classes from './TopNavBar.module.css';

interface TopNavBarProps {
  onQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
  onCreateFromTemplate?: () => void;
  onNewTemplate?: () => void;
  /** Callback to register the omnibar focus function for global shortcut */
  onRegisterOmnibarFocus?: (focusFn: () => void) => void;
}

/**
 * Top navigation bar containing:
 * - Back/Forward navigation buttons (left)
 * - Omnibar search/command palette (center, flex)
 * - Creation controls: Time Machine, Add (right of omnibar)
 * - System controls: Sync, Theme, Settings (far right)
 */
export function TopNavBar({
  onQuickCapture,
  onOpenShortcuts,
  onCreateFromTemplate,
  onNewTemplate,
  onRegisterOmnibarFocus,
}: TopNavBarProps) {
  const { canGoBack, canGoForward, navigateBack, navigateForward } = useNavigation();
  const { windowControlsHeight, windowControlsWidth, isMacOS, isWindows, isLinux } = usePlatform();
  const omnibarRef = useRef<OmnibarRef>(null);

  // Register omnibar focus function for Cmd+K shortcut
  useEffect(() => {
    if (onRegisterOmnibarFocus) {
      onRegisterOmnibarFocus(() => {
        omnibarRef.current?.focus();
      });
    }
  }, [onRegisterOmnibarFocus]);

  // Height should accommodate window controls
  const barHeight = Math.max(48, windowControlsHeight + 16);

  // Padding to clear window controls
  // macOS: traffic lights on left
  // Windows/Linux: window controls on right (handled by Tauri)
  const paddingLeft = isMacOS ? windowControlsWidth + 8 : 16;
  const paddingRight = (isWindows || isLinux) ? 16 : 16;

  return (
    <Box
      component="header"
      data-tauri-drag-region
      className={classes.topNavBar}
      style={{
        height: barHeight,
        minHeight: barHeight,
        paddingLeft,
        paddingRight,
      }}
    >
      {/* Left section: Back/Forward */}
      <Group gap="xs" className={classes.navButtonGroup}>
        <NavigationButtons
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={navigateBack}
          onForward={navigateForward}
        />
      </Group>

      {/* Center section: Omnibar (flex) */}
      <Omnibar
        ref={omnibarRef}
        onQuickCapture={onQuickCapture}
        onOpenShortcuts={onOpenShortcuts}
        onCreateFromTemplate={onCreateFromTemplate}
        onNewTemplate={onNewTemplate}
      />

      {/* Creation controls (right of omnibar) */}
      <Group gap="xs">
        <CreationControls onCreateFromTemplate={onCreateFromTemplate} />
      </Group>

      {/* System controls (far right) */}
      <Group gap="xs" className={classes.rightControls}>
        <SystemControls />
      </Group>
    </Box>
  );
}

// Export ref type for use in parent components
export type { OmnibarRef };
