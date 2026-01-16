/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectHeader } from '../ObjectHeader';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import * as contexts from '@/contexts';
import { BuiltInTypeIds } from '@/lib/types';

// Mock ResizeObserver as a class
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

// Mock dependencies
vi.mock('@/contexts', () => ({
  useNavigation: vi.fn(),
  useTypeRegistry: vi.fn(),
}));

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <div data-testid={`icon-${name}`}>{name}</div>
  ),
}));

// Mock getIconFromEmoji helper
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn((icon) => icon),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ObjectHeader', () => {
  const mockObject = {
    id: 'obj-1',
    typeId: BuiltInTypeIds.NOTE,
    properties: {
      title: 'Test Title',
    },
  };

  const mockTypeDef = {
    name: 'Note',
    icon: 'file-text',
  };

  const mockHandlers = {
    onTitleChange: vi.fn(),
    onPin: vi.fn(),
    onDuplicate: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onTypeChange: vi.fn(),
  };

  const mockOpenInSplit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useNavigation as any).mockReturnValue({
      openInSplit: mockOpenInSplit,
      splitPane: { isOpen: false, mode: 'default' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useTypeRegistry as any).mockReturnValue({
      get: vi.fn((typeId) => ({ name: typeId, icon: 'icon' })),
    });
  });

  it('should render title and icon', () => {
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Test Title')).toBeDefined();
    expect(screen.getByTestId('icon-file-text')).toBeDefined();
  });

  it('should start editing title on click', () => {
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
      />
    );

    fireEvent.click(screen.getByText('Test Title'));

    const input = screen.getByDisplayValue('Test Title');
    expect(input.tagName).toBe('INPUT');
  });

  it('should save title on blur', () => {
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
      />
    );

    fireEvent.click(screen.getByText('Test Title'));
    const input = screen.getByDisplayValue('Test Title');

    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.blur(input);

    expect(mockHandlers.onTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('should cancel edit on Escape', () => {
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
      />
    );

    fireEvent.click(screen.getByText('Test Title'));
    const input = screen.getByDisplayValue('Test Title');

    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockHandlers.onTitleChange).not.toHaveBeenCalled();
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('should show quick actions in primary pane', () => {
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
        paneType="primary"
      />
    );

    expect(screen.getByTestId('icon-pin')).toBeDefined();
    expect(screen.getByTestId('icon-copy')).toBeDefined();
  });

  it('should show close button in secondary pane', () => {
    const onCloseSplit = vi.fn();
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
        paneType="secondary"
        onCloseSplit={onCloseSplit}
      />
    );

    const closeButton = screen.getByLabelText('Close split view');
    fireEvent.click(closeButton);
    expect(onCloseSplit).toHaveBeenCalled();
  });

  it('should handle type change', async () => {
    renderWithProvider(
      <ObjectHeader
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object={mockObject as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeDef={mockTypeDef as any}
        {...mockHandlers}
        canChangeType={true}
      />
    );

    fireEvent.click(screen.getByTestId('icon-file-text'));

    await expect(screen.findByText('Change type to')).resolves.toBeDefined();
  });
});
