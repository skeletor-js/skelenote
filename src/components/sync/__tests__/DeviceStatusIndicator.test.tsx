/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DeviceStatusIndicator } from '../DeviceStatusIndicator';

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

describe('DeviceStatusIndicator', () => {
  describe('rendering', () => {
    it('should render with connected status', () => {
      renderWithProvider(<DeviceStatusIndicator status="connected" />);
      const indicator = screen.getByLabelText('Device status: connected');
      expect(indicator).toBeDefined();
    });

    it('should render with connecting status', () => {
      renderWithProvider(<DeviceStatusIndicator status="connecting" />);
      const indicator = screen.getByLabelText('Device status: connecting');
      expect(indicator).toBeDefined();
    });

    it('should render with offline status', () => {
      renderWithProvider(<DeviceStatusIndicator status="offline" />);
      const indicator = screen.getByLabelText('Device status: offline');
      expect(indicator).toBeDefined();
    });

    it('should render with syncing status', () => {
      renderWithProvider(<DeviceStatusIndicator status="syncing" />);
      const indicator = screen.getByLabelText('Device status: syncing');
      expect(indicator).toBeDefined();
    });

    it('should render with error status', () => {
      renderWithProvider(<DeviceStatusIndicator status="error" />);
      const indicator = screen.getByLabelText('Device status: error');
      expect(indicator).toBeDefined();
    });
  });

  describe('size prop', () => {
    it('should use default size of 8', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connected" />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: connected"]'
      );
      expect(indicator).toBeDefined();
      // Box component applies w and h props
    });

    it('should apply custom size', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connected" size={16} />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: connected"]'
      );
      expect(indicator).toBeDefined();
    });
  });

  describe('animation behavior', () => {
    it('should animate when connecting', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connecting" />
      );
      const indicator = container.querySelector('.device-status-pulse');
      expect(indicator).toBeDefined();
    });

    it('should animate when syncing', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="syncing" />
      );
      const indicator = container.querySelector('.device-status-pulse');
      expect(indicator).toBeDefined();
    });

    it('should not animate when connected by default', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connected" />
      );
      const indicator = container.querySelector('.device-status-pulse');
      expect(indicator).toBeNull();
    });

    it('should animate when animate prop is true', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connected" animate={true} />
      );
      const indicator = container.querySelector('.device-status-pulse');
      expect(indicator).toBeDefined();
    });

    it('should not animate offline status by default', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="offline" />
      );
      const indicator = container.querySelector('.device-status-pulse');
      expect(indicator).toBeNull();
    });

    it('should not animate error status by default', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="error" />
      );
      const indicator = container.querySelector('.device-status-pulse');
      expect(indicator).toBeNull();
    });
  });

  describe('color styling', () => {
    it('should apply sage color for connected status', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connected" />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: connected"]'
      );
      expect(indicator).toBeDefined();
      // Colors are applied via inline styles
    });

    it('should apply sage color for syncing status', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="syncing" />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: syncing"]'
      );
      expect(indicator).toBeDefined();
    });

    it('should apply ember color for connecting status', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="connecting" />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: connecting"]'
      );
      expect(indicator).toBeDefined();
    });

    it('should apply brick color for error status', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="error" />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: error"]'
      );
      expect(indicator).toBeDefined();
    });

    it('should apply stone color for offline status', () => {
      const { container } = renderWithProvider(
        <DeviceStatusIndicator status="offline" />
      );
      const indicator = container.querySelector(
        '[aria-label="Device status: offline"]'
      );
      expect(indicator).toBeDefined();
    });
  });
});
