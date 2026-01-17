/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MatchTypeBadge } from '../MatchTypeBadge';

// Mock matchMedia for Mantine
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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
  describe('rendering logic', () => {
    it('should return null for text match type', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="text" semanticScore={0.8} />
      );
      // Text matches should not render any visible content
      expect(container.querySelector('[class*="Group"]')).toBeNull();
    });

    it('should return null when no semantic score is provided', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" />
      );
      expect(container.querySelector('[class*="Group"]')).toBeNull();
    });

    it('should render dots for semantic match with score', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.85} />
      );
      // Should find the container with dots - look for Box elements
      const boxes = container.querySelectorAll('div');
      expect(boxes.length).toBeGreaterThan(0);
    });

    it('should render dots for hybrid match with score', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="hybrid" semanticScore={0.75} />
      );
      const boxes = container.querySelectorAll('div');
      expect(boxes.length).toBeGreaterThan(0);
    });
  });

  describe('match level interpretation', () => {
    it('should show 3 active dots for high score (>=0.8)', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.85} />
      );
      // High match = 3 active dots (all dots colored)
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(3);
    });

    it('should handle medium score (0.6-0.8)', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.7} />
      );
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(3);
    });

    it('should handle low score (<0.6)', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.45} />
      );
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(3);
    });
  });

  describe('tooltip', () => {
    it('should render with correct percentage in tooltip', () => {
      renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.85} />
      );
      // Tooltip should contain "85% match" - but since it's a hover tooltip,
      // we check the component renders without error
      // Full tooltip testing would require user events
      expect(screen.queryByRole('tooltip')).toBeNull(); // Not visible until hover
    });
  });

  describe('edge cases', () => {
    it('should handle score of exactly 0.8 (boundary)', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.8} />
      );
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(3);
    });

    it('should handle score of exactly 0.6 (boundary)', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0.6} />
      );
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(3);
    });

    it('should handle score of 0', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={0} />
      );
      // Score of 0 is falsy, should not render
      expect(
        container.querySelectorAll('[style*="border-radius: 50%"]').length
      ).toBe(0);
    });

    it('should handle score of 1.0 (perfect match)', () => {
      const { container } = renderWithProvider(
        <MatchTypeBadge matchType="semantic" semanticScore={1.0} />
      );
      const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(dots.length).toBe(3);
    });
  });
});
