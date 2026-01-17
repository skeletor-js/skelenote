// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileSearchModal } from '../MobileSearchModal';
import { usePlatform, useSearch } from '@/hooks';
import {
  useNavigation,
  useTypeRegistry,
  useSemanticSearchSafe,
} from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';
import { MantineProvider } from '@mantine/core';

// Mock dependencies
vi.mock('@/hooks', () => ({
  usePlatform: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(),
  useTypeRegistry: vi.fn(),
  useSemanticSearchSafe: vi.fn(),
}));

// Mock the primitives module relative to the test file
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, rightSection }: any) => (
    <div data-testid="mobile-view-header">
      {title}
      {rightSection}
    </div>
  ),
  MatchTypeBadge: () => <div data-testid="match-type-badge">Match</div>,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <div data-testid={`icon-${name}`} />,
}));

describe('MobileSearchModal', () => {
  const mockOnClose = vi.fn();
  const mockNavigateToObject = vi.fn();
  const mockSetQuery = vi.fn();
  let localStorageMock: any;

  const mockTypeRegistry = {
    get: vi.fn((id) => {
      if (id === BuiltInTypeIds.NOTE) return { name: 'Note', icon: 'file' };
      if (id === BuiltInTypeIds.TASK) return { name: 'Task', icon: 'check' };
      return { name: 'Unknown', icon: 'help' };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    localStorageMock = (function () {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();
    vi.stubGlobal('localStorage', localStorageMock);

    // Mock window.matchMedia
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

    // Mock ResizeObserver as a class
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    (usePlatform as any).mockReturnValue({ safeAreaBottom: 20 });
    (useNavigation as any).mockReturnValue({
      navigateToObject: mockNavigateToObject,
    });
    (useTypeRegistry as any).mockReturnValue(mockTypeRegistry);
    (useSemanticSearchSafe as any).mockReturnValue({
      isEnabled: false,
      status: 'disabled',
    });

    (useSearch as any).mockReturnValue({
      results: [],
      isSearching: false,
      setQuery: mockSetQuery,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderModal = (opened = true) => {
    return render(
      <MantineProvider>
        <MobileSearchModal opened={opened} onClose={mockOnClose} />
      </MantineProvider>
    );
  };

  it('renders nothing when closed', () => {
    renderModal(false);
    expect(
      screen.queryByPlaceholderText('Search notes, tasks, projects...')
    ).toBeNull();
  });

  it('renders when opened', () => {
    renderModal(true);
    expect(
      screen.getByPlaceholderText('Search notes, tasks, projects...')
    ).toBeTruthy();
    const header = screen.getByTestId('mobile-view-header');
    expect(header.textContent).toContain('Search');
  });

  it('shows recent searches when query is empty', () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify(['recent1', 'recent2'])
    );
    renderModal(true);

    expect(screen.getByText('Recent Searches')).toBeTruthy();
    expect(screen.getByText('recent1')).toBeTruthy();
    expect(screen.getByText('recent2')).toBeTruthy();
  });

  it('updates query and calls setQuery on input change', async () => {
    renderModal(true);
    const input = screen.getByPlaceholderText(
      'Search notes, tasks, projects...'
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'test query' } });

    expect(input.value).toBe('test query');
    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith('test query');
    });
  });

  it('shows loading state when searching', () => {
    (useSearch as any).mockReturnValue({
      results: [],
      isSearching: true,
      setQuery: mockSetQuery,
    });

    renderModal(true);
    // Ensure "No results" is NOT present
    expect(screen.queryByText('No results')).toBeNull();
  });

  it('shows results grouped by type', () => {
    const mockResults = [
      {
        item: {
          id: '1',
          title: 'Note 1',
          typeId: BuiltInTypeIds.NOTE,
          updatedAt: Date.now(),
        },
        matches: [{ value: 'match text' }],
        matchType: 'text',
      },
      {
        item: {
          id: '2',
          title: 'Task 1',
          typeId: BuiltInTypeIds.TASK,
          updatedAt: Date.now(),
        },
        matches: [],
        matchType: 'text',
      },
    ];

    (useSearch as any).mockReturnValue({
      results: mockResults,
      isSearching: false,
      setQuery: mockSetQuery,
    });

    renderModal(true);

    const input = screen.getByPlaceholderText(
      'Search notes, tasks, projects...'
    );
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByText('Note')).toBeTruthy();
    expect(screen.getByText('Note 1')).toBeTruthy();
    expect(screen.getByText('Task')).toBeTruthy();
    expect(screen.getByText('Task 1')).toBeTruthy();
  });

  it('filters results by type', async () => {
    const mockResults = [
      {
        item: {
          id: '1',
          title: 'Note 1',
          typeId: BuiltInTypeIds.NOTE,
          updatedAt: Date.now(),
        },
        matches: [],
        matchType: 'text',
      },
      {
        item: {
          id: '2',
          title: 'Task 1',
          typeId: BuiltInTypeIds.TASK,
          updatedAt: Date.now(),
        },
        matches: [],
        matchType: 'text',
      },
    ];

    (useSearch as any).mockReturnValue({
      results: mockResults,
      isSearching: false,
      setQuery: mockSetQuery,
    });

    renderModal(true);

    fireEvent.change(
      screen.getByPlaceholderText('Search notes, tasks, projects...'),
      { target: { value: 'test' } }
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(buttons[2]);

    expect(screen.getByText('Type')).toBeTruthy();

    const notesChip = screen.getByText('Notes');
    fireEvent.click(notesChip);

    expect(screen.getByText('Note 1')).toBeTruthy();
    expect(screen.queryByText('Task 1')).toBeNull();
  });

  it('navigates to object on result click', () => {
    const mockResults = [
      {
        item: {
          id: '1',
          title: 'Note 1',
          typeId: BuiltInTypeIds.NOTE,
          updatedAt: Date.now(),
        },
        matches: [],
        matchType: 'text',
      },
    ];

    (useSearch as any).mockReturnValue({
      results: mockResults,
      isSearching: false,
      setQuery: mockSetQuery,
    });

    renderModal(true);
    fireEvent.change(
      screen.getByPlaceholderText('Search notes, tasks, projects...'),
      { target: { value: 'test' } }
    );

    fireEvent.click(screen.getByText('Note 1'));

    expect(mockNavigateToObject).toHaveBeenCalledWith('1');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('saves search to recent searches on navigation', () => {
    const mockResults = [
      {
        item: {
          id: '1',
          title: 'Note 1',
          typeId: BuiltInTypeIds.NOTE,
          updatedAt: Date.now(),
        },
        matches: [],
        matchType: 'text',
      },
    ];

    (useSearch as any).mockReturnValue({
      results: mockResults,
      isSearching: false,
      setQuery: mockSetQuery,
    });

    renderModal(true);
    const input = screen.getByPlaceholderText(
      'Search notes, tasks, projects...'
    );
    fireEvent.change(input, { target: { value: 'saved query' } });

    fireEvent.click(screen.getByText('Note 1'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'skelenote:recentSearches',
      JSON.stringify(['saved query'])
    );
  });
});
