/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { TimeMachineSheet } from '../TimeMachineSheet';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock BottomSheet (must be inline due to vi.mock hoisting)
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

// Mock RestoreConfirmSheet
vi.mock('../RestoreConfirmSheet', () => ({
  RestoreConfirmSheet: () => null,
}));

// Mock contexts
const mockDocStore = {
  getVersionHistoryForObject: vi.fn(),
  restoreFromVersion: vi.fn(),
};
const mockRefreshData = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    docStore: mockDocStore,
    refreshData: mockRefreshData,
  }),
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

describe('TimeMachineSheet', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    opened: true,
    onClose: mockOnClose,
    objectId: 'obj-123',
    objectTitle: 'My Note',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocStore.getVersionHistoryForObject.mockReturnValue({
      objectId: 'obj-123',
      changePoints: [],
    });
  });

  it('should not render when closed', () => {
    renderWithProvider(<TimeMachineSheet {...defaultProps} opened={false} />);

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(<TimeMachineSheet {...defaultProps} />);

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Version History')).toBeDefined();
  });

  it('should show object title', () => {
    renderWithProvider(<TimeMachineSheet {...defaultProps} />);

    expect(screen.getByText('My Note')).toBeDefined();
  });

  it('should show empty state when no versions', () => {
    renderWithProvider(<TimeMachineSheet {...defaultProps} />);

    expect(screen.getByText('No version history available')).toBeDefined();
  });

  it('should show version count badge', () => {
    renderWithProvider(<TimeMachineSheet {...defaultProps} />);

    expect(screen.getByText('0 versions')).toBeDefined();
  });

  it('should show instruction text', () => {
    renderWithProvider(<TimeMachineSheet {...defaultProps} />);

    expect(screen.getByText(/Tap a version to select/)).toBeDefined();
  });

  it('should show versions when history exists', () => {
    const now = Date.now();
    mockDocStore.getVersionHistoryForObject.mockReturnValue({
      objectId: 'obj-123',
      changePoints: [
        {
          timestamp: now,
          peerId: 'peer-1',
          frontier: new Uint8Array([1, 2, 3]),
          changeCount: 5,
          deviceName: 'iPhone',
        },
        {
          timestamp: now - 3600000,
          peerId: 'peer-1',
          frontier: new Uint8Array([1, 2]),
          changeCount: 3,
          deviceName: 'MacBook',
        },
      ],
    });

    renderWithProvider(<TimeMachineSheet {...defaultProps} />);

    expect(screen.getByText('2 versions')).toBeDefined();
    expect(screen.getByText('Current')).toBeDefined();
    expect(screen.getByText('5 changes')).toBeDefined();
    expect(screen.getByText('iPhone')).toBeDefined();
  });
});
