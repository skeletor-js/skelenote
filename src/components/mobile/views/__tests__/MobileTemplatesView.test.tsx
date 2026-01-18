/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileTemplatesView } from '../MobileTemplatesView';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';

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
  navigateToView: vi.fn(),
  refreshData: vi.fn(),
  confirm: vi.fn(),
  remove: vi.fn(),
  duplicate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(() => ({
    navigateToView: mocks.navigateToView,
  })),
  useObjects: vi.fn(() => ({
    refreshData: mocks.refreshData,
  })),
  useTypeRegistry: vi.fn(() => ({
    get: () => ({ name: 'Note', icon: '📝' }),
  })),
}));

vi.mock('@/hooks', () => ({
  useTemplates: vi.fn(() => ({
    templates: [],
    isLoading: false,
    remove: mocks.remove,
    duplicate: mocks.duplicate,
    create: mocks.create,
    update: mocks.update,
  })),
  useConfirmDialog: vi.fn(() => ({
    confirm: mocks.confirm,
  })),
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

// Mock Components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, onBack, rightSection }: any) => (
    <div data-testid="mobile-header">
      {title}
      <button onClick={onBack} data-testid="header-back">
        Back
      </button>
      {rightSection}
    </div>
  ),
  PullToRefresh: ({ children, onRefresh }: any) => (
    <div data-testid="pull-to-refresh">
      <button onClick={onRefresh} data-testid="refresh-trigger">
        Refresh
      </button>
      {children}
    </div>
  ),
  HeaderAddButton: ({ onClick, label }: any) => (
    <button onClick={onClick} data-testid="header-add">
      {label}
    </button>
  ),
  SwipeableRow: ({ children, leftActions, rightActions, onLongPress }: any) => (
    <div
      data-testid="swipeable-row"
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      {children}
      {leftActions.map((a: any) => (
        <button key={a.id} onClick={a.onAction} data-testid={`action-${a.id}`}>
          {a.label}
        </button>
      ))}
      {rightActions.map((a: any) => (
        <button key={a.id} onClick={a.onAction} data-testid={`action-${a.id}`}>
          {a.label}
        </button>
      ))}
    </div>
  ),
  ActionSheet: ({ opened, title, actions }: any) =>
    opened ? (
      <div data-testid="action-sheet">
        {title}
        {actions.map((a: any) => (
          <button
            key={a.id}
            onClick={a.onAction}
            data-testid={`sheet-action-${a.id}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    ) : null,
}));

vi.mock('../../sheets', () => ({
  TemplateEditorSheet: ({ opened, onCreate, onUpdate }: any) =>
    opened ? (
      <div data-testid="template-editor">
        Editor
        <button
          onClick={() => onCreate({ name: 'New' })}
          data-testid="save-new"
        >
          Save New
        </button>
        <button
          onClick={() => onUpdate('id', { name: 'Updated' })}
          data-testid="save-update"
        >
          Save Update
        </button>
      </div>
    ) : null,
}));

import { useTemplates } from '@/hooks';

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileTemplatesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state', () => {
    (useTemplates as any).mockReturnValue({
      templates: [],
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });
    renderWithProvider(<MobileTemplatesView />);
    expect(screen.getByText('No templates yet')).toBeDefined();
  });

  it('renders grouped templates', () => {
    const templates = [
      { id: '1', name: 'Reflect', targetTypeId: BuiltInTypeIds.NOTE },
    ];
    (useTemplates as any).mockReturnValue({
      templates,
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });

    renderWithProvider(<MobileTemplatesView />);
    expect(screen.getByText('Reflect')).toBeDefined();
    // Assuming Note mock returns "Note"
    expect(screen.getByText('Note')).toBeDefined();
  });

  it('filters templates', () => {
    const templates = [
      { id: '1', name: 'Alpha', targetTypeId: BuiltInTypeIds.NOTE },
      { id: '2', name: 'Beta', targetTypeId: BuiltInTypeIds.NOTE },
    ];
    (useTemplates as any).mockReturnValue({
      templates,
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });

    renderWithProvider(<MobileTemplatesView />);
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('handles create action', () => {
    renderWithProvider(<MobileTemplatesView />);
    fireEvent.click(screen.getByTestId('header-add'));
    expect(screen.getByTestId('template-editor')).toBeDefined();

    fireEvent.click(screen.getByTestId('save-new'));
    expect(mocks.create).toHaveBeenCalled();
  });

  it('handles edit action via swipe', () => {
    const templates = [
      { id: '1', name: 'Reflect', targetTypeId: BuiltInTypeIds.NOTE },
    ];
    (useTemplates as any).mockReturnValue({
      templates,
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });

    renderWithProvider(<MobileTemplatesView />);
    fireEvent.click(screen.getByTestId('action-edit'));

    expect(screen.getByTestId('template-editor')).toBeDefined();
    fireEvent.click(screen.getByTestId('save-update'));
    expect(mocks.update).toHaveBeenCalled();
  });

  it('handles delete action via swipe', async () => {
    const templates = [
      { id: '1', name: 'Reflect', targetTypeId: BuiltInTypeIds.NOTE },
    ];
    (useTemplates as any).mockReturnValue({
      templates,
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });
    mocks.confirm.mockResolvedValue(true);

    renderWithProvider(<MobileTemplatesView />);
    fireEvent.click(screen.getByTestId('action-delete'));

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalled();
      expect(mocks.remove).toHaveBeenCalledWith('1');
    });
  });

  it('handles duplicate action via swipe', () => {
    const templates = [
      { id: '1', name: 'Reflect', targetTypeId: BuiltInTypeIds.NOTE },
    ];
    (useTemplates as any).mockReturnValue({
      templates,
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });

    renderWithProvider(<MobileTemplatesView />);
    fireEvent.click(screen.getByTestId('action-duplicate'));
    expect(mocks.duplicate).toHaveBeenCalledWith('1');
  });

  it('handles long press to show action sheet', () => {
    const templates = [
      { id: '1', name: 'Reflect', targetTypeId: BuiltInTypeIds.NOTE },
    ];
    (useTemplates as any).mockReturnValue({
      templates,
      isLoading: false,
      remove: mocks.remove,
      duplicate: mocks.duplicate,
      create: mocks.create,
      update: mocks.update,
    });

    renderWithProvider(<MobileTemplatesView />);
    fireEvent.contextMenu(screen.getByTestId('swipeable-row'));

    expect(screen.getByTestId('action-sheet').textContent).toContain('Reflect');
  });
});
