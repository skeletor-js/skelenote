// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileTypeBrowseView } from '../MobileTypeBrowseView';
import { MantineProvider } from '@mantine/core';
import { useNavigation } from '@/contexts'; // Import for mocking

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

// Mocks
const mockNavigateToView = vi.fn();
const mockNavigateToTypeBrowse = vi.fn();
const mockNavigateToObject = vi.fn();
const mockToast = vi.fn();
const mockNotification = vi.fn();

const mockStore = {
  getAll: vi.fn(),
  getByType: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  archive: vi.fn(),
  markProcessed: vi.fn(),
};

const mockUseObjects = {
  store: mockStore,
  dataVersion: 1,
  isLoading: false,
  refreshData: vi.fn(),
};

const mockTypeRegistry = {
  getAll: vi.fn(),
  get: vi.fn(),
};

const mockSelection = {
  hasSelection: false,
  selectedCount: 0,
  selectedArray: [],
  isSelected: vi.fn().mockReturnValue(false),
  toggle: vi.fn(),
  clear: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(),
  useObjects: () => mockUseObjects,
  useTypeRegistry: () => mockTypeRegistry,
  useToast: () => ({ addToast: mockToast }),
}));

vi.mock('@/hooks', () => ({
  useSelection: () => mockSelection,
  useConfirmDialog: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
  useReducedMotion: () => false,
  useUndoToast: () => ({ showArchiveUndo: vi.fn(), showDeleteUndo: vi.fn() }),
  useHaptics: () => ({ notification: mockNotification }),
}));

vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, onBack, rightSection }: any) => (
    <div>
      <h1>{title}</h1>
      <button onClick={onBack}>Back</button>
      {rightSection}
    </div>
  ),
  PullToRefresh: ({ children }: any) => <>{children}</>,
  SelectionToolbar: ({ visible, onActionsPress }: any) =>
    visible ? <button onClick={onActionsPress}>SelectionToolbar</button> : null,
  ActionSheet: ({ opened }: any) => (opened ? <div>ActionSheet</div> : null),
  ConfirmDialog: ({ opened, onConfirm }: any) =>
    opened ? <button onClick={onConfirm}>ConfirmDialog</button> : null,
  HeaderAddButton: ({ label, onClick }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

vi.mock('../../sheets', () => ({
  BulkActionsSheet: ({ opened, onAction }: any) =>
    opened ? (
      <div>
        <button onClick={() => onAction('archive')}>Bulk Archive</button>
        <button onClick={() => onAction('delete')}>Bulk Delete</button>
      </div>
    ) : null,
}));

vi.mock('../../rows', () => ({
  MobileInboxRow: ({ item, onPress, onLongPress }: any) => (
    <div
      onClick={onPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      Row: {item.properties.title || 'Untitled'}
    </div>
  ),
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span>Icon:{name}</span>,
}));

describe('MobileTypeBrowseView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getAll.mockReturnValue([
      {
        id: '1',
        typeId: 'project',
        properties: { title: 'Project 1' },
        createdAt: Date.now(),
      },
      {
        id: '2',
        typeId: 'area',
        properties: { title: 'Area 1' },
        createdAt: Date.now(),
      },
    ]);
    mockTypeRegistry.getAll.mockReturnValue([
      { id: 'project', name: 'Project', icon: 'folder', isBuiltIn: true },
      { id: 'area', name: 'Area', icon: 'layers', isBuiltIn: true },
    ]);
    mockUseObjects.dataVersion = 1;

    // Reset navigation
    vi.mocked(useNavigation).mockReturnValue({
      navigateToView: mockNavigateToView,
      navigateToTypeBrowse: mockNavigateToTypeBrowse,
      navigateToObject: mockNavigateToObject,
      browseTypeId: null,
      currentView: 'browse',
    } as unknown as ReturnType<typeof useNavigation>);
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <MobileTypeBrowseView />
      </MantineProvider>
    );
  };

  describe('Type List Mode', () => {
    it('renders list of types with counts', () => {
      renderView();
      expect(screen.getByText('Browse Types')).toBeTruthy();
      expect(screen.getByText('Project')).toBeTruthy();
      expect(screen.getByText('Area')).toBeTruthy();
      // Counts
      expect(screen.getAllByText('1')).toHaveLength(2); // 1 project, 1 area
    });

    it('navigates to type detail on click', () => {
      renderView();
      fireEvent.click(screen.getByText('Project'));
      expect(mockNavigateToTypeBrowse).toHaveBeenCalledWith('project');
    });
  });

  describe('Filtered Object List Mode', () => {
    beforeEach(() => {
      // Set browseTypeId to 'project'
      vi.mocked(useNavigation).mockReturnValue({
        navigateToView: mockNavigateToView,
        navigateToObject: mockNavigateToObject,
        navigateToTypeBrowse: mockNavigateToTypeBrowse,
        browseTypeId: 'project',
        currentView: 'browse',
      } as unknown as ReturnType<typeof useNavigation>);
      mockTypeRegistry.get.mockReturnValue({
        id: 'project',
        name: 'Project',
        icon: 'folder',
        hasContent: true,
      });
      mockStore.getByType.mockReturnValue([
        {
          id: '1',
          typeId: 'project',
          properties: { title: 'Project 1' },
          createdAt: Date.now(),
        },
        {
          id: '3',
          typeId: 'project',
          properties: { title: 'Project 2' },
          createdAt: Date.now() - 86400000 * 2,
        }, // Older
      ]);
    });

    it('renders filtered objects', () => {
      renderView();
      expect(screen.getByText('Project')).toBeTruthy(); // Header title
      expect(screen.getByText('Row: Project 1')).toBeTruthy();
      expect(screen.getByText('Row: Project 2')).toBeTruthy();
    });

    it('navigates to object on click', () => {
      renderView();
      fireEvent.click(screen.getByText('Row: Project 1'));
      expect(mockNavigateToObject).toHaveBeenCalledWith('1');
    });

    it('creates new object', () => {
      mockStore.create.mockReturnValue({ id: 'new-id' });
      renderView();
      fireEvent.click(screen.getByText('New Project'));
      expect(mockStore.create).toHaveBeenCalledWith({
        typeId: 'project',
        properties: {},
        withContent: true,
        inboxed: false,
      });
      expect(mockNavigateToObject).toHaveBeenCalledWith('new-id');
    });

    it('enters selection mode on long press', async () => {
      renderView();
      const row = screen.getByText('Row: Project 1');
      fireEvent.contextMenu(row); // Simulation of long press in our mock

      await waitFor(() => {
        expect(mockSelection.toggle).toHaveBeenCalledWith('1');
        expect(mockNotification).toHaveBeenCalledWith('success');
      });
    });
  });
});
