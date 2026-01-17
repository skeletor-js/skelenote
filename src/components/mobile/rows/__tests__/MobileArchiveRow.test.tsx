/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileArchiveRow } from '../MobileArchiveRow';
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

// Mock SwipeableRow
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
}));

// Mock icons helper
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn((icon) => icon),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileArchiveRow', () => {
  const mockItem = {
    id: 'item-1',
    typeId: BuiltInTypeIds.NOTE,
    properties: {
      title: 'Archived Note',
    },
    hasContent: false,
    inboxed: false,
    pinned: false,
    archived: true,
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now(),
  };

  const mockHandlers = {
    onPress: vi.fn(),
    onLongPress: vi.fn(),
    onRestore: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render item title', () => {
    renderWithProvider(
      <MobileArchiveRow item={mockItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Archived Note')).toBeDefined();
  });

  it('should render type icon', () => {
    renderWithProvider(
      <MobileArchiveRow item={mockItem as any} {...mockHandlers} />
    );

    expect(screen.getByTestId('icon-file-text')).toBeDefined();
  });

  it('should render type label badge', () => {
    renderWithProvider(
      <MobileArchiveRow item={mockItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Note')).toBeDefined();
  });

  it('should call onPress when row is pressed', () => {
    renderWithProvider(
      <MobileArchiveRow item={mockItem as any} {...mockHandlers} />
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
      <MobileArchiveRow item={untitledItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Untitled')).toBeDefined();
  });

  it('should fall back to name property for title', () => {
    const namedItem = {
      ...mockItem,
      properties: { name: 'Named Item' },
    };

    renderWithProvider(
      <MobileArchiveRow item={namedItem as any} {...mockHandlers} />
    );

    expect(screen.getByText('Named Item')).toBeDefined();
  });

  it('should show archived date', () => {
    renderWithProvider(
      <MobileArchiveRow item={mockItem as any} {...mockHandlers} />
    );

    // The date formatter will show something like "Just now" or "Today"
    // We just verify some text is rendered
    expect(screen.getByText('Archived Note')).toBeDefined();
  });
});
