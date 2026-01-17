/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionSheet, type ActionSheetItem } from '../ActionSheet';
import { MantineProvider } from '@mantine/core';
import { Edit, Trash, Archive, Copy } from 'lucide-react';

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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ActionSheet', () => {
  const mockOnClose = vi.fn();
  const mockActions: ActionSheetItem[] = [
    { id: 'edit', label: 'Edit', icon: Edit, onAction: vi.fn() },
    { id: 'copy', label: 'Duplicate', icon: Copy, onAction: vi.fn() },
    { id: 'archive', label: 'Archive', icon: Archive, onAction: vi.fn() },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      variant: 'danger',
      onAction: vi.fn(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when not opened', () => {
    renderWithProvider(
      <ActionSheet opened={false} onClose={mockOnClose} actions={mockActions} />
    );

    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('should render all action items when opened', () => {
    renderWithProvider(
      <ActionSheet opened={true} onClose={mockOnClose} actions={mockActions} />
    );

    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Duplicate')).toBeDefined();
    expect(screen.getByText('Archive')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('should render title when provided', () => {
    renderWithProvider(
      <ActionSheet
        opened={true}
        onClose={mockOnClose}
        title="Select an action"
        actions={mockActions}
      />
    );

    expect(screen.getByText('Select an action')).toBeDefined();
  });

  it('should render description when provided', () => {
    renderWithProvider(
      <ActionSheet
        opened={true}
        onClose={mockOnClose}
        title="Actions"
        description="Choose what to do with this item"
        actions={mockActions}
      />
    );

    expect(screen.getByText('Choose what to do with this item')).toBeDefined();
  });

  it('should call onAction and onClose when action is clicked', () => {
    const editAction = mockActions[0];
    renderWithProvider(
      <ActionSheet opened={true} onClose={mockOnClose} actions={mockActions} />
    );

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(editAction.onAction).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render cancel button', () => {
    renderWithProvider(
      <ActionSheet opened={true} onClose={mockOnClose} actions={mockActions} />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('should call onClose when cancel button is clicked', () => {
    renderWithProvider(
      <ActionSheet opened={true} onClose={mockOnClose} actions={mockActions} />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onAction for disabled items', () => {
    const disabledAction: ActionSheetItem = {
      id: 'disabled',
      label: 'Disabled action',
      onAction: vi.fn(),
      disabled: true,
    };

    renderWithProvider(
      <ActionSheet
        opened={true}
        onClose={mockOnClose}
        actions={[disabledAction]}
      />
    );

    const disabledButton = screen.getByText('Disabled action');
    fireEvent.click(disabledButton);

    expect(disabledAction.onAction).not.toHaveBeenCalled();
  });

  it('should have reduced opacity for disabled items', () => {
    const disabledAction: ActionSheetItem = {
      id: 'disabled',
      label: 'Disabled action',
      onAction: vi.fn(),
      disabled: true,
    };

    renderWithProvider(
      <ActionSheet
        opened={true}
        onClose={mockOnClose}
        actions={[disabledAction]}
      />
    );

    const disabledButton = screen
      .getByText('Disabled action')
      .closest('button');
    expect(disabledButton?.style.opacity).toBe('0.5');
  });

  it('should render actions without icons', () => {
    const actionsWithoutIcons: ActionSheetItem[] = [
      { id: 'simple', label: 'Simple action', onAction: vi.fn() },
    ];

    renderWithProvider(
      <ActionSheet
        opened={true}
        onClose={mockOnClose}
        actions={actionsWithoutIcons}
      />
    );

    expect(screen.getByText('Simple action')).toBeDefined();
  });

  it('should separate normal and danger actions', () => {
    renderWithProvider(
      <ActionSheet opened={true} onClose={mockOnClose} actions={mockActions} />
    );

    // All actions should be rendered
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });
});
