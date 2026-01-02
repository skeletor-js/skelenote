import { Box } from '@mantine/core';
import { usePlatform } from '@/hooks';

interface TitleBarSpacerProps {
  /** Whether this spacer is in the sidebar (left) or main content area */
  variant: 'sidebar' | 'main';
}

/**
 * TitleBarSpacer - Provides spacing for window controls and drag area.
 *
 * On macOS with overlay title bar, this component creates space for the
 * traffic light buttons and provides a draggable region for window movement.
 * On Windows/Linux, this component renders nothing.
 */
export function TitleBarSpacer({ variant }: TitleBarSpacerProps) {
  const { isMacOS, windowControlsHeight } = usePlatform();

  // Only render on macOS where traffic lights need clearance
  if (!isMacOS) {
    return null;
  }

  return (
    <Box
      data-tauri-drag-region
      style={{
        height: windowControlsHeight,
        minHeight: windowControlsHeight,
        width: '100%',
        // Ensure this area doesn't shrink
        flexShrink: 0,
        // Background matches the container
        backgroundColor:
          variant === 'sidebar' ? 'var(--surface-canvas)' : 'var(--surface-paper)',
      }}
      aria-hidden="true"
    />
  );
}
