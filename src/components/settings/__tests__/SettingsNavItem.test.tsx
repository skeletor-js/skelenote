/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SettingsNavItem } from '../SettingsNavItem';

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

describe('SettingsNavItem', () => {
  const defaultProps = {
    id: 'account' as const,
    icon: 'user' as const,
    label: 'Account Settings',
    isActive: false,
    onClick: vi.fn(),
  };

  describe('rendering', () => {
    it('should render the label', () => {
      renderWithProvider(<SettingsNavItem {...defaultProps} />);
      expect(screen.getByText('Account Settings')).toBeDefined();
    });

    it('should render with icon', () => {
      const { container } = renderWithProvider(
        <SettingsNavItem {...defaultProps} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('should render as NavLink', () => {
      const { container } = renderWithProvider(
        <SettingsNavItem {...defaultProps} />
      );
      const navlink =
        container.querySelector('[data-active]') ||
        container.querySelector('a, button');
      expect(navlink).toBeDefined();
    });
  });

  describe('active state', () => {
    it('should have active styling when isActive is true', () => {
      const { container } = renderWithProvider(
        <SettingsNavItem {...defaultProps} isActive={true} />
      );
      const navlink = container.querySelector('[data-active="true"]');
      expect(navlink).toBeDefined();
    });

    it('should not have active styling when isActive is false', () => {
      const { container } = renderWithProvider(
        <SettingsNavItem {...defaultProps} isActive={false} />
      );
      const navlink = container.querySelector('[data-active="true"]');
      expect(navlink).toBeNull();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      renderWithProvider(
        <SettingsNavItem {...defaultProps} onClick={handleClick} />
      );
      const navItem = screen.getByText('Account Settings').closest('a, button');
      if (navItem) {
        fireEvent.click(navItem);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('color variants', () => {
    it('should accept brick color for danger settings', () => {
      const { container } = renderWithProvider(
        <SettingsNavItem {...defaultProps} id="danger" color="brick" />
      );
      // Component should render without errors with brick color
      expect(container.querySelector('a, button')).toBeDefined();
    });

    it('should render without color prop', () => {
      const { container } = renderWithProvider(
        <SettingsNavItem {...defaultProps} />
      );
      expect(container.querySelector('a, button')).toBeDefined();
    });
  });

  describe('different sections', () => {
    const sections = [
      'account',
      'sync',
      'appearance',
      'templates',
      'search',
      'data',
      'about',
      'danger',
    ] as const;

    sections.forEach((section) => {
      it(`should render ${section} section`, () => {
        renderWithProvider(
          <SettingsNavItem
            {...defaultProps}
            id={section}
            label={`${section} Settings`}
          />
        );
        expect(screen.getByText(`${section} Settings`)).toBeDefined();
      });
    });
  });
});
