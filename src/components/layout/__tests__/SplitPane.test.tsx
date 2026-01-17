/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplitPane } from '../SplitPane';
import { MantineProvider } from '@mantine/core';
import React from 'react';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock external split pane library
vi.mock('@gfazioli/mantine-split-pane', () => {
  const Split = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="split-container">{children}</div>
  );

  (Split as any).Pane = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="split-pane">{children}</div>
  );

  (Split as any).Resizer = () => <div data-testid="split-resizer" />;
  return { Split };
});

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('SplitPane', () => {
  const defaultProps = {
    secondaryContent: null,
    splitWidth: 50,
    onWidthChange: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render only children when secondaryContent is null', () => {
    renderWithProvider(
      <SplitPane {...defaultProps}>
        <div>Primary Content</div>
      </SplitPane>
    );

    expect(screen.getByText('Primary Content')).toBeDefined();
    // Should not render split container but just the box content
    // In the implementation: if (!secondaryContent) return <Box>{children}</Box>
    expect(screen.queryByTestId('split-container')).toBeNull();
  });

  it('should render split view when secondaryContent is present', () => {
    renderWithProvider(
      <SplitPane
        {...defaultProps}
        secondaryContent={<div>Secondary Content</div>}
      >
        <div>Primary Content</div>
      </SplitPane>
    );

    expect(screen.getByText('Primary Content')).toBeDefined();
    expect(screen.getByText('Secondary Content')).toBeDefined();
    expect(screen.getByTestId('split-container')).toBeDefined();
  });

  it('should call onClose when media query matches mobile', () => {
    const onClose = vi.fn();

    // Use a clean mock implementation for this test
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    renderWithProvider(
      <SplitPane
        {...defaultProps}
        secondaryContent={<div>Secondary</div>}
        onClose={onClose}
      >
        <div>Primary</div>
      </SplitPane>
    );

    expect(onClose).toHaveBeenCalled();
  });
});
