/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileDailyNotesView } from '../MobileDailyNotesView';
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

// Hoisted mocks
const mocks = vi.hoisted(() => ({
  navigateToObject: vi.fn(),
  refreshData: vi.fn(),
  ensureExists: vi.fn(),
  toggleComplete: vi.fn(),
  archiveTask: vi.fn(),
  store: {
    get: vi.fn(),
    getContent: vi.fn(),
    setContent: vi.fn(),
  },
  // Mock Editor
  Editor: vi.fn(({ onContentChange }) => (
    <div data-testid="editor">
      Editor Content
      <button
        onClick={() => onContentChange({ type: 'doc', content: [] })}
        data-testid="editor-change"
      >
        Change Content
      </button>
    </div>
  )),
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateToObject: mocks.navigateToObject,
  })),
  useObjects: vi.fn(() => ({
    store: mocks.store,
    refreshData: mocks.refreshData,
  })),
  useTypeRegistry: vi.fn(() => ({})),
}));

vi.mock('@/hooks', () => ({
  useDailyNote: vi.fn(),
  useTasks: vi.fn(),
}));

vi.mock('@/components/editor', () => ({
  Editor: mocks.Editor,
}));

// Mock RelationHelper
vi.mock('@/lib/loro', () => ({
  RelationHelper: class {
    findBacklinks = vi.fn().mockReturnValue([]);
  },
}));

// Mock Components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, rightSection }: any) => (
    <div data-testid="mobile-header">
      {title}
      {rightSection}
    </div>
  ),
  CollapsibleSection: ({ title, children, defaultOpen }: any) => (
    <div data-testid={`section-${title}`}>
      {title}
      {children}
    </div>
  ),
}));

vi.mock('../../rows', () => ({
  MobileTaskRow: ({ task, onPress, onToggleComplete, onArchive }: any) => (
    <div data-testid={`task-row-${task.id}`} onClick={onPress}>
      {task.properties.title}
    </div>
  ),
}));

import { useDailyNote, useTasks } from '@/hooks';

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileDailyNotesView', () => {
  const mockDate = new Date('2024-01-01T12:00:00'); // A Monday

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(mockDate);
    vi.clearAllMocks();

    // Default mock implementations
    (useDailyNote as any).mockReturnValue({
      dailyNote: { id: 'note-2024-01-01' },
      isLoading: false,
      ensureExists: mocks.ensureExists,
    });

    (useTasks as any).mockReturnValue({
      tasks: [],
      toggleComplete: mocks.toggleComplete,
      archiveTask: mocks.archiveTask,
    });

    mocks.store.get.mockReturnValue({ properties: { title: 'Linked Note' } });
    mocks.store.getContent.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state', () => {
    (useDailyNote as any).mockReturnValue({
      dailyNote: null,
      isLoading: true,
      ensureExists: mocks.ensureExists,
    });

    renderWithProvider(<MobileDailyNotesView />);
    // Assuming Loader renders usually, but our mock replaces Header
    expect(screen.getByTestId('mobile-header')).toBeDefined();
  });

  it('renders daily note view details', () => {
    renderWithProvider(<MobileDailyNotesView />);
    expect(screen.getByText('Daily Notes')).toBeDefined();
    // Should show current date
    expect(screen.getByText('Monday, January 1')).toBeDefined();
  });

  it('initializes editor with content', () => {
    mocks.store.getContent.mockReturnValue({ type: 'doc' });
    renderWithProvider(<MobileDailyNotesView />);
    expect(screen.getByTestId('editor')).toBeDefined();
  });

  it('handles interactions with empty state editor (tap to start)', () => {
    (useDailyNote as any).mockReturnValue({
      dailyNote: null, // No note yet
      isLoading: false,
      ensureExists: mocks.ensureExists,
    });

    renderWithProvider(<MobileDailyNotesView />);
    const placeholder = screen.getByText('Tap to start writing...');
    fireEvent.click(placeholder);
    expect(mocks.ensureExists).toHaveBeenCalled();
  });

  it('updates content on change', () => {
    renderWithProvider(<MobileDailyNotesView />);
    fireEvent.click(screen.getByTestId('editor-change'));
    expect(mocks.store.setContent).toHaveBeenCalledWith(
      'note-2024-01-01',
      expect.any(String)
    );
    expect(mocks.refreshData).toHaveBeenCalled();
  });

  it('renders tasks due today', () => {
    const tasks = [{ id: '1', properties: { title: 'Task 1' } }];
    (useTasks as any).mockReturnValue({
      tasks,
      toggleComplete: mocks.toggleComplete,
      archiveTask: mocks.archiveTask,
    });

    renderWithProvider(<MobileDailyNotesView />);
    expect(screen.getByText('Tasks due')).toBeDefined();
    expect(screen.getByText('Task 1')).toBeDefined();
  });

  it('renders week strip and handles navigation', () => {
    renderWithProvider(<MobileDailyNotesView />);

    // Initial state: Jan 1 is in the week.
    // Jan 1 2024 is Monday. Week start (Sunday) is Dec 31 2023.
    // Label should show "Dec 31 - Jan 6"
    expect(screen.getByTestId('week-label').textContent).toContain(
      'Dec 31 - Jan 6'
    );

    // Go to next week
    fireEvent.click(screen.getByTestId('next-week'));
    // Next week: Jan 7 - Jan 13
    // Since start and end month are same (Jan), format is "Month Start-End"
    expect(screen.getByTestId('week-label').textContent).toContain('Jan 7-13');

    // Go to previous week
    fireEvent.click(screen.getByTestId('prev-week'));
    expect(screen.getByTestId('week-label').textContent).toContain(
      'Dec 31 - Jan 6'
    );
  });

  // Add test id to MobileDailyNotesView.tsx if needed, or rely on finding icons.
});
