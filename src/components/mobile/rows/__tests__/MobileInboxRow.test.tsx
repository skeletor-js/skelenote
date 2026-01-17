/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileInboxRow } from '../MobileInboxRow';
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

// Mock contexts
vi.mock('@/contexts', () => ({
  useObjects: vi.fn(() => ({
    store: {
      get: vi.fn(() => null),
    },
  })),
  useTypeRegistry: vi.fn(() => ({
    get: vi.fn(() => ({
      name: 'Note',
      icon: 'file-text',
    })),
  })),
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  useHaptics: vi.fn(() => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  })),
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>{name}</span>
  ),
}));

// Mock SwipeableRow and AnimatedCheckbox
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
      data-testid="inbox-checkbox"
      checked={checked}
      onChange={onChange}
    />
  ),
}));

// Mock icons helper
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn((icon) => icon),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileInboxRow', () => {
  const mockItem = {
    id: 'item-1',
    typeId: BuiltInTypeIds.NOTE,
    properties: {
      title: 'Test Inbox Item',
    },
    hasContent: false,
    inboxed: true,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockHandlers = {
    onPress: vi.fn(),
    onLongPress: vi.fn(),
    onProcess: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render item title', () => {
    renderWithProvider(
      <MobileInboxRow item={mockItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Test Inbox Item')).toBeDefined();
  });

  it('should render type icon when not in selection mode', () => {
    renderWithProvider(
      <MobileInboxRow item={mockItem as any} {...mockHandlers} />
    );

    expect(screen.getByTestId('icon-file-text')).toBeDefined();
  });

  it('should call onPress when row is pressed', () => {
    renderWithProvider(
      <MobileInboxRow item={mockItem as any} {...mockHandlers} />
    );

    const row = screen.getByTestId('swipeable-row');
    fireEvent.click(row);

    expect(mockHandlers.onPress).toHaveBeenCalled();
  });

  it('should show Untitled when item has no title', () => {
    const untitledItem = {
      ...mockItem,
      properties: {},
    };

    renderWithProvider(
      <MobileInboxRow item={untitledItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Untitled')).toBeDefined();
  });

  it('should fall back to name property for title', () => {
    const namedItem = {
      ...mockItem,
      properties: { name: 'Named Item' },
    };

    renderWithProvider(
      <MobileInboxRow item={namedItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Named Item')).toBeDefined();
  });

  describe('selection mode', () => {
    it('should show checkbox when in selection mode', () => {
      renderWithProvider(
        <MobileInboxRow
          item={mockItem as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={false}
          onToggleSelection={vi.fn()}
        />
      );

      expect(screen.getByTestId('inbox-checkbox')).toBeDefined();
    });

    it('should show checked state based on isSelected', () => {
      renderWithProvider(
        <MobileInboxRow
          item={mockItem as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={true}
          onToggleSelection={vi.fn()}
        />
      );

      const checkbox = screen.getByTestId('inbox-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call onToggleSelection when row pressed in selection mode', () => {
      const onToggleSelection = vi.fn();
      renderWithProvider(
        <MobileInboxRow
          item={mockItem as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={false}
          onToggleSelection={onToggleSelection}
        />
      );

      const row = screen.getByTestId('swipeable-row');
      fireEvent.click(row);

      expect(onToggleSelection).toHaveBeenCalledWith('item-1');
      expect(mockHandlers.onPress).not.toHaveBeenCalled();
    });

    it('should call onToggleSelection when checkbox toggled', () => {
      const onToggleSelection = vi.fn();
      renderWithProvider(
        <MobileInboxRow
          item={mockItem as any}
          {...mockHandlers}
          selectionMode={true}
          isSelected={false}
          onToggleSelection={onToggleSelection}
        />
      );

      const checkbox = screen.getByTestId('inbox-checkbox');
      fireEvent.click(checkbox);

      expect(onToggleSelection).toHaveBeenCalledWith('item-1');
    });
  });
});
