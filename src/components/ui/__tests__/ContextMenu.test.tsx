/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from '../ContextMenu';
import { MantineProvider } from '@mantine/core';
import React from 'react';

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

// Mock Portal to render children directly for easier testing
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core');
  return {
    ...actual,
    Portal: ({ children }: any) => <div>{children}</div>,
  };
});

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ContextMenu', () => {
  const items = [
    { id: '1', label: 'Item 1', onClick: vi.fn() },
    { id: '2', label: 'Item 2', onClick: vi.fn(), disabled: true },
    { id: '3', label: 'Delete', onClick: vi.fn(), variant: 'danger' as const },
  ];

  it('renders nothing when closed', () => {
    renderWithProvider(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Item 1')).toBeNull();
  });

  it('renders items when open', () => {
    renderWithProvider(
      <ContextMenu
        items={items}
        position={{ x: 100, y: 100 }}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('handles item click', () => {
    const onClose = vi.fn();
    renderWithProvider(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Item 1'));
    expect(items[0].onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores disabled items', () => {
    const onClose = vi.fn();
    renderWithProvider(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Item 2'));
    expect(items[1].onClick).not.toHaveBeenCalled();
  });
});
