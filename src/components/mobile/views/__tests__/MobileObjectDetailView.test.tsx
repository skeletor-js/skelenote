/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileObjectDetailView } from '../MobileObjectDetailView';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';
import { linkObjectToDaily } from '@/lib/daily';
import { usePinnedObjects } from '@/hooks';

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

// Mock Contexts and Hooks
const mockNavigateBack = vi.fn();
const mockNavigateToObject = vi.fn();
const mockRefreshData = vi.fn();
const mockStore = {
  get: vi.fn(),
  setContent: vi.fn(),
  setProperty: vi.fn(),
  getContent: vi.fn(),
  archive: vi.fn(),
};
const mockTypeRegistry = {
  get: vi.fn(),
};
const mockPin = vi.fn();
const mockUnpin = vi.fn();
const mockDuplicate = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateBack: mockNavigateBack,
    navigateToObject: mockNavigateToObject,
  })),
  useObjects: vi.fn(() => ({
    store: mockStore,
    refreshData: mockRefreshData,
    isLoading: false,
  })),
  useTypeRegistry: vi.fn(() => mockTypeRegistry),
  useToast: vi.fn(() => ({
    addToast: mockAddToast,
  })),
  useSemanticSearchSafe: vi.fn(() => ({
    isEnabled: false,
    status: 'ready',
    threshold: 0.2,
    getEngine: vi.fn(),
  })),
}));

vi.mock('@/hooks', () => ({
  usePlatform: vi.fn(() => ({
    safeAreaBottom: 0,
  })),
  usePinnedObjects: vi.fn(() => ({
    isPinned: vi.fn(() => false),
    pin: mockPin,
    unpin: mockUnpin,
  })),
  useDuplicate: vi.fn(() => ({
    duplicate: mockDuplicate,
  })),
}));

// Mock Lib
vi.mock('@/lib/loro', () => ({
  RelationHelper: class {
    findBacklinks = vi.fn(() => []);
  },
}));

vi.mock('@/lib/daily', () => ({
  linkObjectToDaily: vi.fn(),
}));

// Mock Components
vi.mock('@/components/editor', () => ({
  Editor: () => <div data-testid="editor">Editor Content</div>,
}));

vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, onBack, rightSection }: any) => (
    <div data-testid="mobile-view-header">
      <button onClick={onBack} data-testid="header-back">
        Back
      </button>
      <span>{title}</span>
      {rightSection}
    </div>
  ),
  ActionSheet: ({ opened, actions }: any) =>
    opened ? (
      <div data-testid="action-sheet">
        {actions.map((action: any) => (
          <button
            key={action.id}
            onClick={action.onAction}
            data-testid={`action-${action.id}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    ) : null,
  CollapsibleSection: ({ title, children, count }: any) => (
    <div data-testid="collapsible-section">
      <div>
        {title} ({count})
      </div>
      {children}
    </div>
  ),
}));

vi.mock('../../sheets', () => ({
  PropertyEditorSheet: ({ opened, onSave }: any) =>
    opened ? (
      <div data-testid="property-sheet">
        <button onClick={() => onSave('New Value')}>Save</button>
      </div>
    ) : null,
  RelationPickerSheet: ({ opened }: any) =>
    opened ? <div data-testid="relation-sheet">Relation Sheet</div> : null,
  StatusPickerSheet: ({ opened, onSelect }: any) =>
    opened ? (
      <div data-testid="status-sheet">
        <button onClick={() => onSelect('done')}>Done</button>
      </div>
    ) : null,
  PriorityPickerSheet: ({ opened, onSelect }: any) =>
    opened ? (
      <div data-testid="priority-sheet">
        <button onClick={() => onSelect('urgent')}>Urgent</button>
      </div>
    ) : null,
  DueDateSheet: ({ opened, onSelect }: any) =>
    opened ? (
      <div data-testid="due-date-sheet">
        <button onClick={() => onSelect(1234567890)}>Select Date</button>
      </div>
    ) : null,
  RecurrenceSheet: ({ opened, onSave }: any) =>
    opened ? (
      <div data-testid="recurrence-sheet">
        <button onClick={() => onSave('daily')}>Set Daily</button>
      </div>
    ) : null,
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileObjectDetailView', () => {
  const mockNoteDef = {
    name: 'Note',
    schema: [
      { id: 'title', name: 'Title', type: 'text' },
      { id: 'tags', name: 'Tags', type: 'relation' },
    ],
    hasContent: true,
  };

  const mockTaskDef = {
    name: 'Task',
    schema: [
      { id: 'title', name: 'Title', type: 'text' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'priority', name: 'Priority', type: 'select' },
      { id: 'dueDate', name: 'Due Date', type: 'date' },
      { id: 'recurrence', name: 'Recurrence', type: 'recurrence' },
    ],
    hasContent: true,
  };

  const mockNoteObj = {
    id: 'note-1',
    typeId: BuiltInTypeIds.NOTE,
    properties: {
      title: 'Test Note',
      tags: [],
    },
  };

  const mockTaskObj = {
    id: 'task-1',
    typeId: BuiltInTypeIds.TASK,
    properties: {
      title: 'Test Task',
      status: 'todo',
      priority: 'medium',
      dueDate: 1700000000000,
      recurrence: 'daily',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.get.mockImplementation((id) => {
      if (id === 'note-1') return mockNoteObj;
      if (id === 'task-1') return mockTaskObj;
      return null;
    });
    mockTypeRegistry.get.mockImplementation((id) => {
      if (id === BuiltInTypeIds.NOTE) return mockNoteDef;
      if (id === BuiltInTypeIds.TASK) return mockTaskDef;
      return null;
    });
  });

  it('renders loading state when object not found', () => {
    mockStore.get.mockReturnValue(null);
    renderWithProvider(<MobileObjectDetailView objectId="missing-1" />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders note details correctly', () => {
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    expect(screen.getByDisplayValue('Test Note')).toBeDefined();
    // Header title from type def
    expect(screen.getByText('Note')).toBeDefined();
    // Editor rendering
    expect(screen.getByTestId('editor')).toBeDefined();
  });

  it('allows editing title', () => {
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    const input = screen.getByDisplayValue('Test Note');
    fireEvent.change(input, { target: { value: 'Updated Note' } });
    expect(mockStore.setProperty).toHaveBeenCalledWith(
      'note-1',
      'title',
      'Updated Note'
    );
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('renders task specific badges', () => {
    renderWithProvider(<MobileObjectDetailView objectId="task-1" />);
    expect(screen.getByText('Todo')).toBeDefined();
    expect(screen.getByText('Medium')).toBeDefined();
    // expect(screen.getByText('Nov 14')).toBeDefined(); // Based on timestamp
    // expect(screen.getByText('Every day')).toBeDefined(); // Recurrence formatter
  });

  it('opens status picker sheet for task', () => {
    renderWithProvider(<MobileObjectDetailView objectId="task-1" />);
    fireEvent.click(screen.getByText('Todo'));
    expect(screen.getByTestId('status-sheet')).toBeDefined();
  });

  it('handles status change', () => {
    renderWithProvider(<MobileObjectDetailView objectId="task-1" />);
    fireEvent.click(screen.getByText('Todo'));
    fireEvent.click(screen.getByText('Done')); // From mocked sheet
    expect(mockStore.setProperty).toHaveBeenCalledWith(
      'task-1',
      'status',
      'done'
    );
  });

  it('opens property sheet when clicking property chip', async () => {
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    fireEvent.click(screen.getByText('0 items'));
    await waitFor(() =>
      expect(screen.getByTestId('relation-sheet')).toBeDefined()
    );
  });

  it('handles archive action', async () => {
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    // Click More actions button
    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    // Wait for sheet
    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    // Now click Archive in sheet by TestId
    const archiveBtn = screen.getByTestId('action-archive');
    fireEvent.click(archiveBtn);

    expect(mockStore.archive).toHaveBeenCalledWith('note-1');
    expect(mockNavigateBack).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('handles duplicate action', async () => {
    mockDuplicate.mockReturnValue({ id: 'note-new' });
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);

    // Open menu first
    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    const duplicateBtn = screen.getByTestId('action-duplicate'); // Expecting action sheet
    fireEvent.click(duplicateBtn);

    expect(mockDuplicate).toHaveBeenCalledWith('note-1');
    expect(mockNavigateToObject).toHaveBeenCalledWith('note-new');
  });

  it('handles pin toggle', async () => {
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    // Open menu first
    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    const pinBtn = screen.getByTestId('action-pin');
    fireEvent.click(pinBtn);
    expect(mockPin).toHaveBeenCalledWith('note-1');
  });

  it('handles unpin toggle', async () => {
    (usePinnedObjects as any).mockReturnValue({
      isPinned: () => true,
      pin: mockPin,
      unpin: mockUnpin,
    });

    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    // Open menu first
    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    const unpinBtn = screen.getByTestId('action-pin');
    fireEvent.click(unpinBtn);
    expect(mockUnpin).toHaveBeenCalledWith('note-1');
  });

  it('links to daily note', async () => {
    renderWithProvider(<MobileObjectDetailView objectId="note-1" />);
    // Open menu first
    const moreBtn = screen.getByLabelText('More options');
    fireEvent.click(moreBtn);

    await waitFor(() =>
      expect(screen.getByTestId('action-sheet')).toBeDefined()
    );

    const linkBtn = screen.getByTestId('action-link-daily');
    fireEvent.click(linkBtn);

    expect(linkObjectToDaily).toHaveBeenCalled();
    await waitFor(() => expect(mockAddToast).toHaveBeenCalled());
  });
});
