/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MatchTypeBadge } from '../MatchTypeBadge';
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

describe('MatchTypeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render dots for text match type', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="text" semanticScore={0.9} />
    );

    // Should not have any Group or dots
    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(0);
  });

  it('should not render dots when no semantic score provided', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" />
    );

    // Should not have any Group or dots
    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(0);
  });

  it('should render for semantic match with score', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.85} />
    );

    expect(container.firstChild).not.toBeNull();
  });

  it('should render for hybrid match with score', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="hybrid" semanticScore={0.75} />
    );

    expect(container.firstChild).not.toBeNull();
  });

  it('should show 3 dots for high score (>=0.8)', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.85} />
    );

    // Get all dot elements (should be 3 boxes in the Group)
    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
  });

  it('should show 3 dots for medium score (0.6-0.8)', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.7} />
    );

    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
  });

  it('should show 3 dots for low score (<0.6)', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.4} />
    );

    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
  });

  it('should render smaller dots for sm size', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.85} size="sm" />
    );

    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
    const firstDot = dots[0] as HTMLElement;
    expect(firstDot.style.width).toBe('4px');
  });

  it('should render larger dots for md size', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.85} size="md" />
    );

    const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
    const firstDot = dots[0] as HTMLElement;
    expect(firstDot.style.width).toBe('5px');
  });

  it('should render with Mantine Group wrapper', () => {
    const { container } = renderWithProvider(
      <MatchTypeBadge matchType="semantic" semanticScore={0.85} />
    );

    // The wrapper should have cursor: help for tooltip
    const wrapper = container.querySelector('.mantine-Group-root');
    expect(wrapper).not.toBeNull();
  });
});
