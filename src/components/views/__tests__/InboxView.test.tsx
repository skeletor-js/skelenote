// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InboxView } from '../InboxView';
import { MantineProvider } from '@mantine/core';
import { useSelection } from '@/hooks';

// Mock hooks
const mockUseInbox = vi.fn();

vi.mock('@/hooks', () => ({
  useInbox: () => mockUseInbox(),
  useSelection: vi.fn(),
  usePinnedObjects: () => ({
    pinnedObjects: [],
    pin: vi.fn(),
    unpin: vi.fn(),
  }),
  useDuplicate: () => ({
    duplicate: vi.fn(),
    canDuplicate: vi.fn().mockReturnValue(true),
  }),
}));

const mockNavigateToObject = vi.fn();
const mockOpenInSplit = vi.fn();
vi.mock('@/contexts', () => ({
  useNavigation: () => ({
    navigateToObject: mockNavigateToObject,
    openInSplit: mockOpenInSplit,
  }),
  useObjects: () => ({
    refreshData: vi.fn(),
    store: {
      getPinnedObjects: vi.fn().mockReturnValue([]),
      getInboxed: vi.fn().mockReturnValue([]),
      get: vi.fn(),
      update: vi.fn(),
    },
  }),
  useToast: () => ({
    addToast: vi.fn(),
  }),
  useTypeRegistry: () => ({
    get: vi.fn().mockReturnValue({ name: 'Tag', icon: 'tag' }),
    getAll: vi.fn().mockReturnValue([]),
  }),
}));

// Mock ObjectSearchModal (used for picker modals)
vi.mock('@/components/object/editors', () => ({
  ObjectSearchModal: () => null,
}));

// Mock child components
vi.mock('../InboxRow', () => ({
  InboxRow: ({ item, isSelected, onSelectionChange }: any) => (
    <div
      data-testid="inbox-row"
      data-id={item.id}
      onClick={() => onSelectionChange(item.id, false)}
    >
      {item.properties.title} - Selected: {isSelected.toString()}
    </div>
  ),
}));

vi.mock('@/components/actions', () => ({
  BulkActions: ({ selectedIds }: any) => (
    <div data-testid="bulk-actions">Selected: {selectedIds.length}</div>
  ),
}));

// Default data
const defaultItems = [
  {
    id: '1',
    createdAt: new Date().getTime(),
    properties: { title: 'Today Item' },
  },
  {
    id: '2',
    createdAt: new Date(Date.now() - 86400000).getTime(),
    properties: { title: 'Yesterday Item' },
  },
  {
    id: '3',
    createdAt: new Date(Date.now() - 1000000000).getTime(),
    properties: { title: 'Older Item' },
  },
];

describe('InboxView', () => {
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

    // Default useInbox mock
    mockUseInbox.mockReturnValue({
      items: defaultItems,
      isLoading: false,
      count: 3,
      processItem: vi.fn(),
      archiveItem: vi.fn(),
    });

    // Default useSelection mock
    vi.mocked(useSelection).mockReturnValue({
      selectedArray: [],
      isSelected: () => false,
      toggle: vi.fn(),
      selectRange: vi.fn(),
      selectAll: vi.fn(),
      clear: vi.fn(),
      hasSelection: false,
      allIds: ['1', '2', '3'],
    } as any);
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <InboxView />
      </MantineProvider>
    );
  };

  it('should render loading state', () => {
    mockUseInbox.mockReturnValue({ items: [], isLoading: true, count: 0 });
    renderView();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should render empty state', () => {
    mockUseInbox.mockReturnValue({ items: [], isLoading: false, count: 0 });
    renderView();
    expect(screen.getByText('All clear! Nothing to process.')).toBeTruthy();
  });

  it('should group items by date', () => {
    renderView();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByText('Older')).toBeTruthy();

    expect(screen.getByText(/Today Item/)).toBeTruthy();
    expect(screen.getByText(/Yesterday Item/)).toBeTruthy();
  });

  it('should handle selection interactions', () => {
    const mockToggle = vi.fn();
    vi.mocked(useSelection).mockReturnValue({
      selectedArray: [],
      isSelected: () => false,
      toggle: mockToggle,
      selectRange: vi.fn(),
      selectAll: vi.fn(),
      clear: vi.fn(),
      hasSelection: false,
      allIds: ['1', '2', '3'],
    } as any);

    renderView();

    const row = screen.getByText(/Today Item/);
    fireEvent.click(row);
    expect(mockToggle).toHaveBeenCalledWith('1');
  });

  it('should handle keyboard select all', () => {
    const mockSelectAll = vi.fn();
    vi.mocked(useSelection).mockReturnValue({
      selectedArray: [],
      isSelected: () => false,
      toggle: vi.fn(),
      selectRange: vi.fn(),
      selectAll: mockSelectAll,
      clear: vi.fn(),
      hasSelection: false,
      allIds: ['1', '2', '3'],
    } as any);

    renderView();

    const container = screen
      .getByText('Inbox')
      .closest('[data-inbox-view]') as HTMLElement;

    // Mock document.activeElement
    const originalActiveElement = document.activeElement;
    Object.defineProperty(document, 'activeElement', {
      value: container,
      configurable: true,
    });

    fireEvent.keyDown(document, { key: 'a', ctrlKey: true });

    expect(mockSelectAll).toHaveBeenCalled();

    // cleanup
    Object.defineProperty(document, 'activeElement', {
      value: originalActiveElement,
      configurable: true,
    });
  });
});
