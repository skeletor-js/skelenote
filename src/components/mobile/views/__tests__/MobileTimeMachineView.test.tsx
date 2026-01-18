// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTimeMachineView } from '../MobileTimeMachineView';
import { MantineProvider } from '@mantine/core';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mocks
const mockDocStore = {
  getVersionHistory: vi.fn(),
  getObjectsAtVersion: vi.fn(),
  restoreFromVersion: vi.fn(),
};
const mockRefreshData = vi.fn();
const mockAddToast = vi.fn();
const mockHaptics = {
  impact: vi.fn(),
  notification: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    docStore: mockDocStore,
    refreshData: mockRefreshData,
  }),
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('@/hooks', () => ({
  useHaptics: () => mockHaptics,
}));

// Mock child components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title }: any) => <h1>{title}</h1>,
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock('../../sheets', () => ({
  RestoreConfirmSheet: ({ opened, onConfirm }: any) =>
    opened ? (
      <div data-testid="restore-sheet">
        <button onClick={() => onConfirm('all')}>Confirm Restore</button>
      </div>
    ) : null,
}));

// Test Data
const mockChangePoint = {
  timestamp: Date.parse('2025-01-01T12:00:00Z'),
  frontier: [],
  peerId: 'peer1',
  changeCount: 1,
  deviceName: 'Test Device',
  isFromRevokedDevice: false,
};

// History with one change
const mockHistoryFull = {
  byDate: new Map([
    [
      '2025-01-01',
      {
        date: '2025-01-01',
        changePoints: [mockChangePoint],
        totalChanges: 1,
      },
    ],
  ]),
  changePoints: [mockChangePoint],
};

const mockHistoryEmpty = {
  byDate: new Map(),
  changePoints: [],
};

describe('MobileTimeMachineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    mockDocStore.getVersionHistory.mockReturnValue(mockHistoryFull);
    mockDocStore.getObjectsAtVersion.mockReturnValue([]);
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <MobileTimeMachineView />
      </MantineProvider>
    );
  };

  it('should render empty state when no history', () => {
    mockDocStore.getVersionHistory.mockReturnValue(mockHistoryEmpty);
    renderView();
    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('No History Yet')).toBeTruthy();
  });

  it('should render week strip and change points', () => {
    renderView();
    expect(screen.getByText('Time Machine')).toBeTruthy();
    // 2025-01-01 is Wednesday. Week strip renders Mon-Sun.
    // We should see "1" for the date (Jan 1)
    expect(screen.getByText('1')).toBeTruthy();

    expect(
      screen.getByText('Select a date with changes to browse history')
    ).toBeTruthy();
  });

  it('should select date and show changes', () => {
    renderView();
    fireEvent.click(screen.getByText('1'));

    expect(screen.getByText('Wednesday, January 1')).toBeTruthy();
    expect(screen.getByText('1 change')).toBeTruthy();
    expect(mockHaptics.impact).toHaveBeenCalledWith('light');
  });

  it('should restore version', async () => {
    // Setup history with 2 points so the older one is not latest
    const newerChange = {
      ...mockChangePoint,
      timestamp: mockChangePoint.timestamp + 1000,
    };
    const historyMulti = {
      byDate: new Map([
        [
          '2025-01-01',
          {
            date: '2025-01-01',
            changePoints: [mockChangePoint, newerChange],
            totalChanges: 2,
          },
        ],
      ]),
      changePoints: [mockChangePoint, newerChange],
    };
    mockDocStore.getVersionHistory.mockReturnValue(historyMulti);

    renderView();

    // Select date
    fireEvent.click(screen.getByText('1'));

    // Select the older change (first ones in UI usually)
    const items = screen.getAllByText('Test Device');
    fireEvent.click(items[0]);

    // Click restore
    const restoreBtn = screen.getByText('Restore to this version');
    fireEvent.click(restoreBtn);

    // Confirm
    const confirmBtn = screen.getByText('Confirm Restore');
    mockDocStore.restoreFromVersion.mockReturnValue(true);
    fireEvent.click(confirmBtn);

    expect(mockDocStore.restoreFromVersion).toHaveBeenCalled();
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });
});
