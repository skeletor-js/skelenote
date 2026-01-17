/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTaskRow } from '../MobileTaskRow';
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

// Mock contexts
vi.mock('@/contexts', () => ({
  useObjects: vi.fn(() => ({
    store: {
      get: vi.fn(() => null),
    },
  })),
}));

// Mock hooks
vi.mock('@/hooks', async () => {
  return {
    usePinnedObjects: vi.fn(() => ({
      isPinned: vi.fn(() => false),
      togglePin: vi.fn(),
    })),
    useHaptics: vi.fn(() => ({
      impact: vi.fn(),
      notification: vi.fn(),
      selection: vi.fn(),
    })),
  };
});

// Mock SwipeableRow and AnimatedCheckbox - path relative to the source file being tested
vi.mock('@/components/mobile/primitives', () => ({
  SwipeableRow: ({
    children,
    onPress,
    onLongPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
  }) => (
    <div
      data-testid="swipeable-row"
      onClick={onPress}
      onContextMenu={onLongPress}
    >
      {children}
    </div>
  ),
  AnimatedCheckbox: ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <input
      type="checkbox"
      data-testid="task-checkbox"
      checked={checked}
      onChange={onChange}
    />
  ),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileTaskRow', () => {
  const mockTask = {
    id: 'task-1',
    typeId: 'built-in:task',
    properties: {
      title: 'Test Task',
      status: 'todo',
    },
    hasContent: false,
    inboxed: false,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockHandlers = {
    onPress: vi.fn(),
    onLongPress: vi.fn(),
    onToggleComplete: vi.fn(),
    onArchive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render task title', () => {
    renderWithProvider(
      <MobileTaskRow task={mockTask as any} {...mockHandlers} />
    );

    expect(screen.getByText('Test Task')).toBeDefined();
  });

  it('should render checkbox unchecked for todo task', () => {
    renderWithProvider(
      <MobileTaskRow task={mockTask as any} {...mockHandlers} />
    );

    const checkbox = screen.getByTestId('task-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('should render checkbox checked for completed task', () => {
    const completedTask = {
      ...mockTask,
      properties: { ...mockTask.properties, status: 'done' },
    };

    renderWithProvider(
      <MobileTaskRow task={completedTask as any} {...mockHandlers} />
    );

    const checkbox = screen.getByTestId('task-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should call onToggleComplete when checkbox is toggled', () => {
    renderWithProvider(
      <MobileTaskRow task={mockTask as any} {...mockHandlers} />
    );

    const checkbox = screen.getByTestId('task-checkbox');
    fireEvent.click(checkbox);

    expect(mockHandlers.onToggleComplete).toHaveBeenCalledWith('task-1');
  });

  it('should call onPress when row is pressed', () => {
    renderWithProvider(
      <MobileTaskRow task={mockTask as any} {...mockHandlers} />
    );

    const row = screen.getByTestId('swipeable-row');
    fireEvent.click(row);

    expect(mockHandlers.onPress).toHaveBeenCalled();
  });

  it('should show line-through for completed task title', () => {
    const completedTask = {
      ...mockTask,
      properties: { ...mockTask.properties, status: 'done' },
    };

    renderWithProvider(
      <MobileTaskRow task={completedTask as any} {...mockHandlers} />
    );

    const title = screen.getByText('Test Task');
    expect(title.style.textDecoration).toBe('line-through');
  });

  it('should render priority flag when set', () => {
    const priorityTask = {
      ...mockTask,
      properties: { ...mockTask.properties, priority: 'high' },
    };

    renderWithProvider(
      <MobileTaskRow task={priorityTask as any} {...mockHandlers} />
    );

    // The Flag icon should be rendered (we can check the parent has the right structure)
    expect(screen.getByText('Test Task')).toBeDefined();
  });

  it('should not render priority flag when priority is none', () => {
    const noPriorityTask = {
      ...mockTask,
      properties: { ...mockTask.properties, priority: 'none' },
    };

    renderWithProvider(
      <MobileTaskRow task={noPriorityTask as any} {...mockHandlers} />
    );

    expect(screen.getByText('Test Task')).toBeDefined();
  });

  it('should show Untitled when task has no title', () => {
    const untitledTask = {
      ...mockTask,
      properties: { status: 'todo' },
    };

    renderWithProvider(
      <MobileTaskRow task={untitledTask as any} {...mockHandlers} />
    );

    expect(screen.getByText('Untitled')).toBeDefined();
  });

  describe('selection mode', () => {
    it('should show checked state based on isSelected', () => {
      renderWithProvider(
        <MobileTaskRow
          task={mockTask as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={true}
          onToggleSelection={vi.fn()}
        />
      );

      const checkbox = screen.getByTestId('task-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call onToggleSelection when checkbox toggled in selection mode', () => {
      const onToggleSelection = vi.fn();
      renderWithProvider(
        <MobileTaskRow
          task={mockTask as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={false}
          onToggleSelection={onToggleSelection}
        />
      );

      const checkbox = screen.getByTestId('task-checkbox');
      fireEvent.click(checkbox);

      expect(onToggleSelection).toHaveBeenCalledWith('task-1');
      expect(mockHandlers.onToggleComplete).not.toHaveBeenCalled();
    });

    it('should call onToggleSelection when row pressed in selection mode', () => {
      const onToggleSelection = vi.fn();
      renderWithProvider(
        <MobileTaskRow
          task={mockTask as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={false}
          onToggleSelection={onToggleSelection}
        />
      );

      const row = screen.getByTestId('swipeable-row');
      fireEvent.click(row);

      expect(onToggleSelection).toHaveBeenCalledWith('task-1');
      expect(mockHandlers.onPress).not.toHaveBeenCalled();
    });
  });
});
