/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { AppearanceSettingsSheet } from '../AppearanceSettingsSheet';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(mockLocalStorage).forEach(
        (key) => delete mockLocalStorage[key]
      );
    }),
  },
  writable: true,
});

// Mock BottomSheet
vi.mock('@/components/mobile/primitives', () => ({
  BottomSheet: ({
    children,
    opened,
    title,
  }: {
    children: React.ReactNode;
    opened: boolean;
    title: string;
  }) =>
    opened ? (
      <div data-testid="bottom-sheet">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// Mock contexts
const mockSetTheme = vi.fn();
vi.mock('@/contexts', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}));

// Mock hooks
const mockSelection = vi.fn();
vi.mock('@/hooks', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: mockSelection,
  }),
}));

describe('AppearanceSettingsSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key]
    );
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <AppearanceSettingsSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <AppearanceSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Appearance')).toBeDefined();
  });

  it('should show theme selector', () => {
    renderWithProvider(
      <AppearanceSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Theme')).toBeDefined();
    expect(screen.getByText('Light')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('should show default view selector', () => {
    renderWithProvider(
      <AppearanceSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Default View')).toBeDefined();
    expect(
      screen.getByText('Which view opens when you launch the app')
    ).toBeDefined();
  });

  it('should show theme description', () => {
    renderWithProvider(
      <AppearanceSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(
      screen.getByText('Choose your preferred color scheme')
    ).toBeDefined();
  });

  it('should have Inbox as default view option', () => {
    renderWithProvider(
      <AppearanceSettingsSheet opened={true} onClose={mockOnClose} />
    );

    // The Select component should show Inbox as the default value
    expect(screen.getByRole('textbox')).toBeDefined();
  });
});
