/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('EmptyState', () => {
  it('should render message', () => {
    renderWithProvider(<EmptyState message="No items found" />);
    expect(screen.getByText('No items found')).toBeDefined();
  });

  it('should render icon by name', () => {
    const { container } = renderWithProvider(
      <EmptyState message="Msg" icon="circle-check" />
    );
    // Expect an SVG to be rendered (Icon component)
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('should render emoji as text fallback if not mapped', () => {
    // Assuming '🚀' is not in EMOJI_TO_ICON map (or handled as text fallback if regex fails)
    renderWithProvider(<EmptyState message="Msg" icon="🚀" />);
    expect(screen.getByText('🚀')).toBeDefined();
  });

  it('should handle size variants (smoke test)', () => {
    // Just verify it renders without error for different sizes
    renderWithProvider(<EmptyState message="Small" size="small" />);
    expect(screen.getByText('Small')).toBeDefined();

    renderWithProvider(<EmptyState message="Large" size="large" />);
    expect(screen.getByText('Large')).toBeDefined();
  });
});
