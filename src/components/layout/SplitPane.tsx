import { useEffect, type ReactNode } from 'react';
import { Box } from '@mantine/core';
import { Split } from '@gfazioli/mantine-split-pane';
import '@gfazioli/mantine-split-pane/styles.css';

interface SplitPaneProps {
  /** Primary pane content (always visible) */
  children: ReactNode;
  /** Secondary pane content (shown when split is open) */
  secondaryContent: ReactNode | null;
  /** Width of the secondary pane as a percentage (25-75) */
  splitWidth: number;
  /** Callback when width changes from dragging */
  onWidthChange: (width: number) => void;
  /** Callback when close button is clicked */
  onClose: () => void;
}

export function SplitPane({
  children,
  secondaryContent,
  splitWidth,
  onWidthChange: _onWidthChange,
  onClose,
}: SplitPaneProps) {
  // Auto-close split on narrow viewports
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && secondaryContent) {
        onClose();
      }
    };

    // Check initial state
    handleChange(mediaQuery);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [secondaryContent, onClose]);

  // Single pane mode when no secondary content
  if (!secondaryContent) {
    return (
      <Box style={{ height: '100%', overflow: 'auto', minWidth: 0 }}>
        {children}
      </Box>
    );
  }

  return (
    <Split style={{ height: '100%' }}>
      <Split.Pane
        initialWidth={`${100 - splitWidth}%`}
        minWidth="300px"
      >
        <Box style={{ height: '100%', overflow: 'auto', minWidth: 0 }}>
          {children}
        </Box>
      </Split.Pane>
      <Split.Resizer />
      <Split.Pane
        initialWidth={`${splitWidth}%`}
        minWidth="300px"
      >
        <Box
          style={{
            height: '100%',
            overflow: 'auto',
            minWidth: 0,
            borderLeft: '1px solid var(--mantine-color-default-border)',
          }}
          p="md"
        >
          {secondaryContent}
        </Box>
      </Split.Pane>
    </Split>
  );
}
