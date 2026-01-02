import { Box } from '@mantine/core';
import { usePlatform } from '@/hooks';

interface TitleBarSpacerProps {
  /**
   * Variant determines styling:
   * - 'full': Spans entire width with bottom border (used at top of entire app)
   * - 'sidebar': For sidebar only (legacy, kept for compatibility)
   * - 'main': For main content area only (legacy, kept for compatibility)
   */
  variant?: 'full' | 'sidebar' | 'main';
}

/**
 * TitleBarSpacer - Provides spacing for window controls and drag area.
 *
 * Creates space for window controls and provides a draggable region for
 * window movement on all platforms:
 * - macOS: Clears traffic light buttons (top-left)
 * - Windows/Linux: Provides title bar area for window controls (top-right)
 */
export function TitleBarSpacer({ variant = 'full' }: TitleBarSpacerProps) {
  const { windowControlsHeight } = usePlatform();

  // Don't render if no window controls height is needed
  if (windowControlsHeight === 0) {
    return null;
  }

  // Full width variant - spans entire app width
  if (variant === 'full') {
    return (
      <Box
        data-tauri-drag-region
        style={{
          height: windowControlsHeight,
          minHeight: windowControlsHeight,
          width: '100%',
          flexShrink: 0,
          backgroundColor: 'var(--surface-canvas)',
          borderBottom: '1px solid var(--border-default)',
        }}
        aria-hidden="true"
      />
    );
  }

  // Sidebar and main variants - both have bottom border for consistent separation
  return (
    <Box
      data-tauri-drag-region
      style={{
        height: windowControlsHeight,
        minHeight: windowControlsHeight,
        width: '100%',
        flexShrink: 0,
        backgroundColor:
          variant === 'sidebar' ? 'var(--surface-canvas)' : 'var(--surface-paper)',
        borderBottom: '1px solid var(--border-default)',
      }}
      aria-hidden="true"
    />
  );
}
