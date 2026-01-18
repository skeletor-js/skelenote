// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LockScreen } from '../LockScreen';
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    div: ({
      children,
      layout,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mocks
const mockAuthenticate = vi.fn();
const mockNotification = vi.fn();
const mockOnUnlock = vi.fn();

const mockBiometric = {
  biometryName: 'Face ID',
  authenticate: mockAuthenticate,
  isLoading: false,
};

vi.mock('@/hooks', () => ({
  useBiometric: () => mockBiometric,
  useHaptics: () => ({ notification: mockNotification }),
  usePlatform: () => ({ safeAreaTop: 0, safeAreaBottom: 0 }),
  useReducedMotion: () => false,
}));

vi.mock('@/lib/animations', () => ({
  springs: { bouncy: {} },
}));

describe('LockScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBiometric.isLoading = false;
    mockBiometric.authenticate.mockResolvedValue(true); // Default success
  });

  const renderScreen = () => {
    return render(
      <MantineProvider>
        <LockScreen onUnlock={mockOnUnlock} />
      </MantineProvider>
    );
  };

  it('renders lock screen UI', () => {
    renderScreen();
    expect(screen.getByText('Skelenote')).toBeTruthy();
    expect(
      screen.getByText('Unlock with Face ID to access your notes')
    ).toBeTruthy();
    expect(screen.getByText('Unlock with Face ID')).toBeTruthy();
  });

  it('auto-authenticates on mount', async () => {
    mockAuthenticate.mockResolvedValue(true);
    renderScreen();

    // Should be called after 300ms
    await waitFor(
      () => {
        expect(mockAuthenticate).toHaveBeenCalledWith('Unlock Skelenote');
      },
      { timeout: 1000 }
    );
  });

  it('shows success and unlocking on successful auth', async () => {
    mockAuthenticate.mockResolvedValue(true);
    renderScreen();

    await waitFor(
      () => {
        expect(mockAuthenticate).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    await waitFor(
      () => {
        expect(mockNotification).toHaveBeenCalledWith('success');
        expect(screen.getByText('Unlocked')).toBeTruthy();
      },
      { timeout: 1000 }
    );

    // Final unlock callback after 600ms
    await waitFor(
      () => {
        expect(mockOnUnlock).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('shows error on failed auth', async () => {
    mockAuthenticate.mockReset(); // Clear default "true"
    mockAuthenticate.mockResolvedValue(false);
    renderScreen();

    await waitFor(
      () => {
        expect(mockAuthenticate).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    await waitFor(
      () => {
        expect(mockNotification).toHaveBeenCalledWith('error');
        expect(
          screen.getByText('Authentication failed. Please try again.')
        ).toBeTruthy();
      },
      { timeout: 1000 }
    );

    expect(mockOnUnlock).not.toHaveBeenCalled();
  });

  it('handles manual unlock click', async () => {
    renderScreen();
    // Skip waiting for auto trigger, just click
    const button = screen.getByText('Unlock with Face ID');
    fireEvent.click(button);

    expect(mockAuthenticate).toHaveBeenCalled();
  });
});
