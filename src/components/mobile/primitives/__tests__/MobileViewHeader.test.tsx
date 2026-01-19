/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileViewHeader } from '../MobileViewHeader';
import { MantineProvider } from '@mantine/core';
import React from 'react';

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

// Mock contexts
const mockNavigateBack = vi.fn();
const mockNavigateToSearch = vi.fn();

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    canGoBack: true,
    navigateBack: mockNavigateBack,
    navigateToSearch: mockNavigateToSearch,
  })),
}));

// Mock hooks
vi.mock('@/hooks/platform/usePlatform', () => ({
  usePlatform: vi.fn(() => ({
    safeAreaTop: 0,
    safeAreaBottom: 0,
    platform: 'ios',
    isMobile: true,
    isCapacitor: false,
  })),
}));

// Mock MobileSyncIndicator
vi.mock('@/components/mobile/primitives/MobileSyncIndicator', () => ({
  MobileSyncIndicator: () => <div data-testid="sync-indicator">Sync</div>,
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileViewHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title', () => {
    renderWithProvider(<MobileViewHeader title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('should render subtitle when provided', () => {
    renderWithProvider(
      <MobileViewHeader title="Title" subtitle="Subtitle text" />
    );

    expect(screen.getByText('Subtitle text')).toBeDefined();
  });

  it('should render count badge when count > 0', () => {
    renderWithProvider(<MobileViewHeader title="Items" count={42} />);

    expect(screen.getByText('42')).toBeDefined();
  });

  it('should show 99+ when count exceeds 99', () => {
    renderWithProvider(<MobileViewHeader title="Items" count={150} />);

    expect(screen.getByText('99+')).toBeDefined();
  });

  it('should not show count badge when count is 0', () => {
    renderWithProvider(<MobileViewHeader title="Items" count={0} />);

    expect(screen.queryByText('0')).toBeNull();
  });

  describe('back button', () => {
    it('should show back button when showBack is true and canGoBack', () => {
      renderWithProvider(<MobileViewHeader title="Title" showBack={true} />);

      expect(screen.getByLabelText('Go back')).toBeDefined();
    });

    it('should call navigateBack when back button is clicked', () => {
      renderWithProvider(<MobileViewHeader title="Title" showBack={true} />);

      fireEvent.click(screen.getByLabelText('Go back'));

      expect(mockNavigateBack).toHaveBeenCalled();
    });

    it('should call custom onBack when provided', () => {
      const customBack = vi.fn();
      renderWithProvider(
        <MobileViewHeader title="Title" showBack={true} onBack={customBack} />
      );

      fireEvent.click(screen.getByLabelText('Go back'));

      expect(customBack).toHaveBeenCalled();
      expect(mockNavigateBack).not.toHaveBeenCalled();
    });

    it('should not show back button when showBack is false', () => {
      renderWithProvider(<MobileViewHeader title="Title" showBack={false} />);

      expect(screen.queryByLabelText('Go back')).toBeNull();
    });
  });

  describe('search button', () => {
    it('should show search button when showSearch is true', () => {
      renderWithProvider(<MobileViewHeader title="Title" showSearch={true} />);

      expect(screen.getByLabelText('Search')).toBeDefined();
    });

    it('should call navigateToSearch when search button is clicked', () => {
      renderWithProvider(<MobileViewHeader title="Title" showSearch={true} />);

      fireEvent.click(screen.getByLabelText('Search'));

      expect(mockNavigateToSearch).toHaveBeenCalled();
    });

    it('should not show search button when showSearch is false', () => {
      renderWithProvider(<MobileViewHeader title="Title" showSearch={false} />);

      expect(screen.queryByLabelText('Search')).toBeNull();
    });
  });

  describe('sync indicator', () => {
    it('should show sync indicator when showSync is true', () => {
      renderWithProvider(<MobileViewHeader title="Title" showSync={true} />);

      expect(screen.getByTestId('sync-indicator')).toBeDefined();
    });

    it('should not show sync indicator when showSync is false', () => {
      renderWithProvider(<MobileViewHeader title="Title" showSync={false} />);

      expect(screen.queryByTestId('sync-indicator')).toBeNull();
    });
  });

  describe('select button', () => {
    it('should show select button when showSelectButton and onSelectMode provided', () => {
      const onSelectMode = vi.fn();
      renderWithProvider(
        <MobileViewHeader
          title="Title"
          showSelectButton={true}
          onSelectMode={onSelectMode}
        />
      );

      expect(screen.getByText('Select')).toBeDefined();
    });

    it('should call onSelectMode when select button is clicked', () => {
      const onSelectMode = vi.fn();
      renderWithProvider(
        <MobileViewHeader
          title="Title"
          showSelectButton={true}
          onSelectMode={onSelectMode}
        />
      );

      fireEvent.click(screen.getByText('Select'));

      expect(onSelectMode).toHaveBeenCalled();
    });

    it('should not show select button when showSelectButton is false', () => {
      renderWithProvider(
        <MobileViewHeader
          title="Title"
          showSelectButton={false}
          onSelectMode={vi.fn()}
        />
      );

      expect(screen.queryByText('Select')).toBeNull();
    });

    it('should not show select button when onSelectMode is not provided', () => {
      renderWithProvider(
        <MobileViewHeader title="Title" showSelectButton={true} />
      );

      expect(screen.queryByText('Select')).toBeNull();
    });
  });

  describe('right section', () => {
    it('should render custom right section', () => {
      renderWithProvider(
        <MobileViewHeader
          title="Title"
          rightSection={<div data-testid="custom-right">Custom</div>}
        />
      );

      expect(screen.getByTestId('custom-right')).toBeDefined();
    });
  });

  describe('variants', () => {
    it('should render with default variant', () => {
      renderWithProvider(<MobileViewHeader title="Title" variant="default" />);

      expect(screen.getByText('Title')).toBeDefined();
    });

    it('should render with large variant', () => {
      renderWithProvider(<MobileViewHeader title="Title" variant="large" />);

      expect(screen.getByText('Title')).toBeDefined();
    });

    it('should render with compact variant', () => {
      renderWithProvider(<MobileViewHeader title="Title" variant="compact" />);

      expect(screen.getByText('Title')).toBeDefined();
    });
  });
});
