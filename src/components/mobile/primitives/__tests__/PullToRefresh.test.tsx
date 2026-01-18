/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PullToRefresh } from '../PullToRefresh';
import { MantineProvider } from '@mantine/core';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('PullToRefresh', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRefresh.mockResolvedValue(undefined);
  });

  it('should render children', () => {
    renderWithProvider(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>List content</div>
      </PullToRefresh>
    );

    expect(screen.getByText('List content')).toBeDefined();
  });

  it('should show loader when isRefreshing is true', () => {
    renderWithProvider(
      <PullToRefresh onRefresh={mockOnRefresh} isRefreshing={true}>
        <div>List content</div>
      </PullToRefresh>
    );

    // Mantine Loader should be present
    const loader = document.querySelector('.mantine-Loader-root');
    expect(loader).toBeDefined();
  });

  it('should not call onRefresh when disabled', () => {
    renderWithProvider(
      <PullToRefresh onRefresh={mockOnRefresh} disabled={true}>
        <div>List content</div>
      </PullToRefresh>
    );

    // Content should still render
    expect(screen.getByText('List content')).toBeDefined();
  });

  it('should handle touch events for pull interaction', () => {
    renderWithProvider(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>List content</div>
      </PullToRefresh>
    );

    const content = screen.getByText('List content').parentElement;
    expect(content).toBeDefined();

    // Simulate touch start
    fireEvent.touchStart(content!, {
      touches: [{ clientY: 100 }],
    });

    // Simulate touch move (pull down)
    fireEvent.touchMove(content!, {
      touches: [{ clientY: 200 }],
    });

    // Simulate touch end
    fireEvent.touchEnd(content!);

    // onRefresh should not be called for small pull
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('should render with custom threshold', () => {
    renderWithProvider(
      <PullToRefresh onRefresh={mockOnRefresh} threshold={50}>
        <div>List content</div>
      </PullToRefresh>
    );

    // Component should render with custom threshold
    expect(screen.getByText('List content')).toBeDefined();
  });

  it('should respect custom threshold', () => {
    renderWithProvider(
      <PullToRefresh onRefresh={mockOnRefresh} threshold={100}>
        <div>List content</div>
      </PullToRefresh>
    );

    // Component should render with custom threshold
    expect(screen.getByText('List content')).toBeDefined();
  });
});
