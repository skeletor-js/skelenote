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

export interface OmnibarFocusFunctions {
  focus: () => void;
  focusCommandMode: () => void;
}

interface TopNavBarProps {
  onQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
  onCreateFromTemplate?: () => void;
  onNewTemplate?: () => void;
  /** Callback to register the omnibar focus functions for global shortcuts */
  onRegisterOmnibarFocus?: (fns: OmnibarFocusFunctions) => void;
  /** Whether zen mode (sidebar hidden) is active */
  isZenMode?: boolean;
  /** Callback to toggle zen mode */
  onToggleZenMode?: () => void;
}

/**
 * Top navigation bar containing:
 * - Back/Forward navigation buttons (left of omnibar)
 * - Omnibar search/command palette (center)
 * - Creation controls: Time Machine, Add (right of omnibar)
 * - System controls: Sync, Theme, Settings (far right)
 */
export function TopNavBar({
  onQuickCapture,
  onOpenShortcuts,
  onCreateFromTemplate,
  onNewTemplate,
  onRegisterOmnibarFocus,
  isZenMode = false,
  onToggleZenMode,
}: TopNavBarProps) {
  const { canGoBack, canGoForward, navigateBack, navigateForward } = useNavigation();
  const { windowControlsHeight, windowControlsWidth, isMacOS, isWindows, isLinux } = usePlatform();
  const omnibarRef = useRef<OmnibarRef>(null);

  // Register omnibar focus functions for Cmd+K and Cmd+N shortcuts
  useEffect(() => {
    if (onRegisterOmnibarFocus) {
      onRegisterOmnibarFocus({
        focus: () => {
          omnibarRef.current?.focus();
        },
        focusCommandMode: () => {
          omnibarRef.current?.focusCommandMode();
        },
      });
    }
  }, [onRegisterOmnibarFocus]);

  // Height should accommodate window controls
  const barHeight = Math.max(48, windowControlsHeight + 16);

  // Padding to clear window controls and align with view title
  // Back button minimum position should align with view title (sidebar width + content padding)
  const SIDEBAR_WIDTH = 240;
  const CONTENT_PADDING = 16; // ViewHeader px="md"
  const minLeftPosition = SIDEBAR_WIDTH + CONTENT_PADDING; // 256px
  const paddingLeft = isMacOS
    ? Math.max(windowControlsWidth + 8, minLeftPosition)
    : minLeftPosition;
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
      {/* Center section: Back/Forward + Omnibar + Creation controls */}
      <div className={classes.centerGroup}>
        <Group gap="xs" className={classes.navControls}>
          <NavigationButtons
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={navigateBack}
            onForward={navigateForward}
          />
        </Group>
        <Omnibar
          ref={omnibarRef}
          onQuickCapture={onQuickCapture}
          onOpenShortcuts={onOpenShortcuts}
          onCreateFromTemplate={onCreateFromTemplate}
          onNewTemplate={onNewTemplate}
        />
        <Group gap="xs" className={classes.creationControls}>
          <CreationControls onCreateFromTemplate={onCreateFromTemplate} />
        </Group>
      </div>

      {/* System controls (far right) */}
      <Group gap="xs" className={classes.rightControls}>
        <SystemControls isZenMode={isZenMode} onToggleZenMode={onToggleZenMode} />
      </Group>
    </Box>
  );
}

// Export ref type for use in parent components
export type { OmnibarRef };
