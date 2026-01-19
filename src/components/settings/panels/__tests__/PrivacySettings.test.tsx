/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PrivacySettings } from '../PrivacySettings';

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

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock analytics context
const mockAnalytics = {
  isEnabled: true,
  enable: vi.fn(),
  disable: vi.fn(),
  track: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getFeatureFlagVariant: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useAnalytics: () => mockAnalytics,
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('PrivacySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalytics.isEnabled = true;
  });

  describe('rendering', () => {
    it('should render the Privacy heading', () => {
      renderWithProvider(<PrivacySettings />);
      expect(screen.getByText('Privacy')).toBeDefined();
    });

    it('should render the description text', () => {
      renderWithProvider(<PrivacySettings />);
      expect(
        screen.getByText('Control how Skelenote collects usage data.')
      ).toBeDefined();
    });

    it('should render the analytics toggle checkbox', () => {
      renderWithProvider(<PrivacySettings />);
      expect(screen.getByText('Send anonymous usage data')).toBeDefined();
    });

    it('should render the "What we collect" section', () => {
      renderWithProvider(<PrivacySettings />);
      expect(screen.getByText('What we collect')).toBeDefined();
      expect(
        screen.getByText('Feature usage (which views you open)')
      ).toBeDefined();
      expect(screen.getByText('App version and platform')).toBeDefined();
      expect(screen.getByText('Error reports for debugging')).toBeDefined();
    });

    it('should render the "What we never collect" section', () => {
      renderWithProvider(<PrivacySettings />);
      expect(screen.getByText('What we never collect')).toBeDefined();
      expect(screen.getByText('Note content or titles')).toBeDefined();
      expect(screen.getByText('Personal information')).toBeDefined();
      expect(screen.getByText('Skeleton Key or encryption data')).toBeDefined();
    });
  });

  describe('checkbox state', () => {
    it('should show checkbox as checked when analytics is enabled', () => {
      mockAnalytics.isEnabled = true;
      renderWithProvider(<PrivacySettings />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveProperty('checked', true);
    });

    it('should show checkbox as unchecked when analytics is disabled', () => {
      mockAnalytics.isEnabled = false;
      renderWithProvider(<PrivacySettings />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveProperty('checked', false);
    });
  });

  describe('toggle behavior', () => {
    it('should call disable when checkbox is unchecked', () => {
      mockAnalytics.isEnabled = true;
      renderWithProvider(<PrivacySettings />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockAnalytics.disable).toHaveBeenCalledTimes(1);
      expect(mockAnalytics.enable).not.toHaveBeenCalled();
    });

    it('should call enable when checkbox is checked', () => {
      mockAnalytics.isEnabled = false;
      renderWithProvider(<PrivacySettings />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockAnalytics.enable).toHaveBeenCalledTimes(1);
      expect(mockAnalytics.disable).not.toHaveBeenCalled();
    });
  });

  describe('helper text', () => {
    it('should display explanation text for the toggle', () => {
      renderWithProvider(<PrivacySettings />);
      expect(
        screen.getByText(
          /Help improve Skelenote by sharing anonymous usage statistics/i
        )
      ).toBeDefined();
      expect(
        screen.getByText(
          /No personal data, note content, or identifiable information/i
        )
      ).toBeDefined();
    });
  });
});
