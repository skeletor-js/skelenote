/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectRow } from '../ObjectRow';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import * as contexts from '@/contexts';
import * as hooks from '@/hooks';


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

// Mock dependencies
vi.mock('@/contexts', () => ({
  useObjects: vi.fn(),
  useTypeRegistry: vi.fn(),
  useToast: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  usePinnedObjects: vi.fn(),
  useDuplicate: vi.fn(),
}));

// Mock Icon to avoid lucide issues and simplify assertions
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <div data-testid={`icon-${name}`}>{name}</div>
  ),
}));

// Mock Tag
vi.mock('@/components/ui/Tag', () => ({
  Tag: ({ name }: { name: string }) => (
    <div data-testid={`tag-${name}`}>{name}</div>
  ),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ObjectRow', () => {
  const mockObject = {
    id: 'obj-1',
    typeId: 'type-1',
    properties: {
      title: 'Test Object',
      tags: ['tag-1'],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockTag = {
    id: 'tag-1',
    properties: {
      name: 'test-tag',
      color: 'sage',
    },
  };

  const mockTypeDef = {
    name: 'Note',
    icon: 'file-text',
  };

  const mockHandlers = {
    onClick: vi.fn(),
    onOpenInSplit: vi.fn(),
    onArchive: vi.fn(),
  };

  const mockStore = {
    get: vi.fn((id) => (id === 'tag-1' ? mockTag : null)),
  };

  const mockPin = vi.fn();
  const mockUnpin = vi.fn();
  const mockDuplicate = vi.fn();
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useObjects as any).mockReturnValue({ store: mockStore });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useTypeRegistry as any).mockReturnValue({
      get: vi.fn(() => mockTypeDef),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useToast as any).mockReturnValue({ addToast: mockAddToast });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (hooks.usePinnedObjects as any).mockReturnValue({
      isPinned: vi.fn(() => false),
      pin: mockPin,
      unpin: mockUnpin,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (hooks.useDuplicate as any).mockReturnValue({
      canDuplicate: vi.fn(() => true),
      duplicate: mockDuplicate,
    });
  });

  it('should render object details', () => {
    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    expect(screen.getByText('Test Object')).toBeDefined();
    expect(screen.getByTestId('icon-file-text')).toBeDefined();
    expect(screen.getByTestId('tag-test-tag')).toBeDefined();
  });

  it('should handle click', () => {
    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    // The whole row is a button
    // We can target by text usually
    fireEvent.click(screen.getByText('Test Object'));
    expect(mockHandlers.onClick).toHaveBeenCalled();
  });

  it('should handle pin toggle', () => {
    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    // Find pin button
    const pinButton = screen.getByLabelText('Pin to sidebar');
    fireEvent.click(pinButton);

    expect(mockPin).toHaveBeenCalledWith('obj-1');
    expect(mockAddToast).toHaveBeenCalled();
  });

  it('should handle unpin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (hooks.usePinnedObjects as any).mockReturnValue({
      isPinned: vi.fn(() => true),
      pin: mockPin,
      unpin: mockUnpin,
    });

    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    const unpinButton = screen.getByLabelText('Unpin from sidebar');
    fireEvent.click(unpinButton);

    expect(mockUnpin).toHaveBeenCalledWith('obj-1');
  });

  it('should handle archive', () => {
    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    const archiveButton = screen.getByLabelText('Archive');
    fireEvent.click(archiveButton);

    expect(mockHandlers.onArchive).toHaveBeenCalledWith('obj-1');
  });

  it('should handle duplicate', () => {
    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    const duplicateButton = screen.getByLabelText('Duplicate');
    fireEvent.click(duplicateButton);

    expect(mockDuplicate).toHaveBeenCalledWith('obj-1');
  });

  it('should handle open in split', () => {
    renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectRow object={mockObject as any} {...mockHandlers} />
    );

    const splitButton = screen.getByLabelText('Open in split pane');
    fireEvent.click(splitButton);

    expect(mockHandlers.onOpenInSplit).toHaveBeenCalled();
  });
});
