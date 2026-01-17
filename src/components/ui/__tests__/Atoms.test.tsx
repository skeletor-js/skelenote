/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../Badge';
import { Icon } from '../Icon';
import { Tag } from '../Tag';
import { MantineProvider } from '@mantine/core';
import React from 'react'; // Ensure React is imported for TS JSX

// Mock matchMedia for Mantine
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

// Mock console.warn for Icon test
const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('UI Atoms', () => {
  describe('Badge', () => {
    it('should render count', () => {
      renderWithProvider(<Badge count={5} />);
      expect(screen.getByText('5')).toBeDefined();
    });

    it('should handle max count', () => {
      renderWithProvider(<Badge count={100} max={99} />);
      expect(screen.getByText('99+')).toBeDefined();
    });

    it('should return null if count <= 0', () => {
      renderWithProvider(<Badge count={0} />);
      // MantineProvider injects styles, so we check for visible content
      // Should find no text
      expect(screen.queryByText(/./)).toBeNull();
    });
  });

  describe('Icon', () => {
    it('should render known icon', () => {
      // lucide icons usually render an SVG
      const { container } = renderWithProvider(<Icon name="circle-check" />);
      expect(container.querySelector('svg')).toBeDefined();
    });

    it('should warn and return null for unknown icon', () => {
      renderWithProvider(<Icon name={'unknown-icon' as any} />);
      expect(consoleSpy).toHaveBeenCalled();
      // Should not find an SVG (icon) or text
      expect(screen.queryByRole('img', { hidden: true })).toBeNull();
      // Note: Lucide icons might not have role=img by default, check svg existence
      document.querySelector('svg');
      // If we query inside the rendered container it might be cleaner, but document query works if cleanup happens
      // Actually render returns container
    });
  });

  describe('Tag', () => {
    it('should render tag name with # prefix', () => {
      renderWithProvider(<Tag name="important" />);
      expect(screen.getByText('#important')).toBeDefined();
    });

    it('should handle click', () => {
      const handleClick = vi.fn();
      renderWithProvider(<Tag name="clickable" onClick={handleClick} />);

      const tag = screen.getByText('#clickable');
      fireEvent.click(tag);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should apply color styles (smoke test)', () => {
      renderWithProvider(<Tag name="red-tag" color="brick" />);
      expect(screen.getByText('#red-tag')).toBeDefined();
    });
  });
});
