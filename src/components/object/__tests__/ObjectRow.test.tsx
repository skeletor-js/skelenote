/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectRow } from '../ObjectRow';
import { MantineProvider } from '@mantine/core';
import { BuiltInTypeIds } from '@/lib/types';
import React from 'react';

// Mock contexts and hooks
const mockStore = {
  get: vi.fn(),
};

const mockTypeRegistry = {
  get: vi.fn(),
};

const mockAddToast = vi.fn();
const mockPin = vi.fn();
const mockUnpin = vi.fn();
const mockIsPinned = vi.fn();
const mockDuplicate = vi.fn();
const mockCanDuplicate = vi.fn();

// Mock dependencies
vi.mock('@/contexts', () => ({
  useObjects: () => ({ store: mockStore }),
  useTypeRegistry: () => mockTypeRegistry,
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/hooks', () => ({
  usePinnedObjects: () => ({
    isPinned: mockIsPinned,
    pin: mockPin,
    unpin: mockUnpin,
  }),
  useDuplicate: () => ({
    duplicate: mockDuplicate,
    canDuplicate: mockCanDuplicate,
  }),
}));

// Mock utils
vi.mock('@/lib/utils/date', () => ({
  formatRelativeDate: (ts: number) => `Formatted: ${ts}`,
  isOverdue: () => false,
}));

// Mock icons
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: () => 'star',
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

describe('ObjectRow', () => {
  const mockObject = {
    id: 'obj-1',
    typeId: BuiltInTypeIds.NOTE,
    properties: { title: 'Test Note' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTypeRegistry.get.mockReturnValue({ icon: 'file' });
    mockCanDuplicate.mockReturnValue(true);
    mockIsPinned.mockReturnValue(false);
  });

  it('renders object title', () => {
    renderWithProvider(
      <ObjectRow
        object={mockObject as any}
        onClick={vi.fn()}
        onOpenInSplit={vi.fn()}
      />
    );
    expect(screen.getByText('Test Note')).toBeDefined();
  });

  it('handles click', () => {
    const onClick = vi.fn();
    renderWithProvider(
      <ObjectRow
        object={mockObject as any}
        onClick={onClick}
        onOpenInSplit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Test Note'));
    expect(onClick).toHaveBeenCalled();
  });

  it('handles open in split', () => {
    const onOpenInSplit = vi.fn();
    renderWithProvider(
      <ObjectRow
        object={mockObject as any}
        onClick={vi.fn()}
        onOpenInSplit={onOpenInSplit}
      />
    );

    const splitBtn = screen.getByLabelText('Open in split pane');
    fireEvent.click(splitBtn);
    expect(onOpenInSplit).toHaveBeenCalled();
  });

  it('handles pin', () => {
    mockIsPinned.mockReturnValue(false);
    renderWithProvider(
      <ObjectRow
        object={mockObject as any}
        onClick={vi.fn()}
        onOpenInSplit={vi.fn()}
      />
    );

    const pinBtn = screen.getByLabelText('Pin to sidebar');
    fireEvent.click(pinBtn);
    expect(mockPin).toHaveBeenCalledWith('obj-1');
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('handles unpin', () => {
    mockIsPinned.mockReturnValue(true);
    renderWithProvider(
      <ObjectRow
        object={mockObject as any}
        onClick={vi.fn()}
        onOpenInSplit={vi.fn()}
      />
    );

    const unpinBtn = screen.getByLabelText('Unpin from sidebar');
    fireEvent.click(unpinBtn);
    expect(mockUnpin).toHaveBeenCalledWith('obj-1');
  });

  it('handles archive if provided', () => {
    const onArchive = vi.fn();
    renderWithProvider(
      <ObjectRow
        object={mockObject as any}
        onClick={vi.fn()}
        onOpenInSplit={vi.fn()}
        onArchive={onArchive}
      />
    );

    const archiveBtn = screen.getByLabelText('Archive');
    fireEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalledWith('obj-1');
  });

  it('renders first tag if present', () => {
    const objectWithTags = {
      ...mockObject,
      properties: { ...mockObject.properties, tags: ['tag-1'] },
    };
    mockStore.get.mockReturnValue({
      id: 'tag-1',
      properties: { name: 'important', color: 'red' },
    });

    renderWithProvider(
      <ObjectRow
        object={objectWithTags as any}
        onClick={vi.fn()}
        onOpenInSplit={vi.fn()}
      />
    );

    // Tag renders as #name
    expect(screen.getByText('#important')).toBeDefined();
  });
});
