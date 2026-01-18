// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeMachine } from '../TimeMachine';
import { MantineProvider } from '@mantine/core';

// Mock hooks
const mockDocStore = {
  getVersionHistory: vi.fn(),
  getVersionHistoryForObject: vi.fn(),
  getObjectsAtVersion: vi.fn(),
  restoreFromVersion: vi.fn(),
};
const mockRefreshData = vi.fn();
const mockNavigateBack = vi.fn();
const mockNavigateToObject = vi.fn();
const mockNavigateToTimeMachine = vi.fn();
const mockAddToast = vi.fn();

// We need to allow changing this return value
const mockUseNavigation = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    docStore: mockDocStore,
    refreshData: mockRefreshData,
  }),
  useNavigation: () => mockUseNavigation(),
  useToast: () => ({
    addToast: mockAddToast,
  }),
  useTypeRegistry: () => ({
    get: () => ({ icon: 'note' }),
  }),
}));

// Mock child components
vi.mock('../HistoryWeekStrip', () => ({
  HistoryWeekStrip: ({ onDateSelect }: any) => (
    <div data-testid="week-strip">
      <button onClick={() => onDateSelect('2025-01-01')}>Select Date</button>
    </div>
  ),
}));

vi.mock('../HorizontalTimeline', () => ({
  HorizontalTimeline: ({ onIndexChange }: any) => (
    <div data-testid="timeline">
      <button onClick={() => onIndexChange(0)}>Select Change</button>
    </div>
  ),
}));

vi.mock('../SnapshotPreview', () => ({
  SnapshotPreview: ({ onRestore, onRestoreObject }: any) => (
    <div data-testid="snapshot-preview">
      <button onClick={onRestore}>Restore Full</button>
      <button onClick={() => onRestoreObject('1')}>Restore Object 1</button>
    </div>
  ),
}));

vi.mock('../RestoreDialog', () => ({
  RestoreDialog: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="restore-dialog">
        <button onClick={onConfirm}>Confirm Restore</button>
        <button onClick={onCancel}>Cancel Restore</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/ViewHeader', () => ({
  ViewHeader: ({ title, backButton, rightSection }: any) => (
    <div>
      <h1>{title}</h1>
      {backButton && (
        <button onClick={backButton.onClick}>{backButton.label}</button>
      )}
      {rightSection}
    </div>
  ),
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => <span data-testid="icon" />,
}));
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: () => 'emoji-icon',
}));

// Test Data
const mockChangePoints = [{ timestamp: 1000, frontier: [], peerId: 'peer1' }];
const mockHistoryFull = {
  byDate: new Map([
    ['2025-01-01', { date: '2025-01-01', changePoints: mockChangePoints }],
  ]),
  changePoints: mockChangePoints,
};

const mockHistoryFiltered = {
  ...mockHistoryFull,
  objectTitle: 'My Object',
};

describe('TimeMachine', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default Navigation Mock
    mockUseNavigation.mockReturnValue({
      navigateBack: mockNavigateBack,
      navigateToObject: mockNavigateToObject,
      navigateToTimeMachine: mockNavigateToTimeMachine,
      timeMachineObjectFilter: null,
      openVersionComparison: vi.fn(),
    });

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
    mockDocStore.getVersionHistoryForObject.mockReturnValue(
      mockHistoryFiltered
    );
    mockDocStore.getObjectsAtVersion.mockReturnValue([
      { id: '1', properties: { title: 'Obj 1' } },
    ]);
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <TimeMachine />
      </MantineProvider>
    );
  };

  it('should render in full history mode by default', () => {
    renderView();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.queryByText('Back')).toBeNull();
    expect(mockDocStore.getVersionHistory).toHaveBeenCalled();
  });

  it('should render in filtered mode when filter is present', () => {
    mockUseNavigation.mockReturnValue({
      navigateBack: mockNavigateBack,
      navigateToObject: mockNavigateToObject,
      navigateToTimeMachine: mockNavigateToTimeMachine,
      timeMachineObjectFilter: '123',
      openVersionComparison: vi.fn(),
    });

    renderView();
    expect(screen.getByText('My Object')).toBeTruthy();
    expect(screen.getByText('Back')).toBeTruthy();
    expect(mockDocStore.getVersionHistoryForObject).toHaveBeenCalledWith('123');
  });

  it('should handle navigation back from filtered mode', () => {
    mockUseNavigation.mockReturnValue({
      navigateBack: mockNavigateBack,
      navigateToObject: mockNavigateToObject,
      navigateToTimeMachine: mockNavigateToTimeMachine,
      timeMachineObjectFilter: '123',
      openVersionComparison: vi.fn(),
    });

    renderView();
    fireEvent.click(screen.getByText('Back'));
    expect(mockNavigateToObject).toHaveBeenCalledWith('123');
  });

  it('should handle view all history from filtered mode', () => {
    mockUseNavigation.mockReturnValue({
      navigateBack: mockNavigateBack,
      navigateToObject: mockNavigateToObject,
      navigateToTimeMachine: mockNavigateToTimeMachine,
      timeMachineObjectFilter: '123',
      openVersionComparison: vi.fn(),
    });

    renderView();
    // The "All History" button is in the rightSection mock.
    // We didn't render rightSection explicitly in our ViewHeader mock?
    // Wait, the ViewHeader mock renders {rightSection}.

    // We need to check checks if the button exists.
    // The component renders:
    // <Button variant="subtle" size="xs" onClick={handleViewAllHistory}>All History</Button>
    // inside rightSection prop.
    // Our ViewHeader mock renders standard HTML elements?
    // Yes: <div><h1>...</h1>...{rightSection}</div>
    // So "All History" text should be visible.

    // Wait, Button is from Mantine. It renders a button element.
    expect(screen.getByText('All History')).toBeTruthy();
    fireEvent.click(screen.getByText('All History'));
    expect(mockNavigateToTimeMachine).toHaveBeenCalled();
  });

  it('should restore full state', async () => {
    renderView();

    // Select date
    fireEvent.click(screen.getByText('Select Date'));

    // Select change (timeline) - wait for it to appear?
    // It appears if selectedDayChanges is truthy.
    expect(screen.getByTestId('timeline')).toBeTruthy();

    // Snapshot preview should appear if selectedChangePoint is truthy
    expect(screen.getByTestId('snapshot-preview')).toBeTruthy();

    // Find restore button
    fireEvent.click(screen.getByText('Restore Full'));

    // Dialog opens
    expect(screen.getByTestId('restore-dialog')).toBeTruthy();

    // Confirm
    mockDocStore.restoreFromVersion.mockReturnValue(true);
    fireEvent.click(screen.getByText('Confirm Restore'));

    expect(mockDocStore.restoreFromVersion).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });
});
