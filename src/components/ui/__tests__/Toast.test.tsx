/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast } from '../Toast';
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('Toast', () => {
  it('renders message', () => {
    renderWithProvider(
      <Toast
        toast={{ id: '1', message: 'Success!', type: 'success' }}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('Success!')).toBeDefined();
  });

  // Toast component doesn't seem to render description?
  // Reading Toast.tsx:
  // <Text size="sm" style={{ flex: 1 }}>{toast.message}</Text>
  // It only renders toast.message. There is no usage of description prop in the view_file output.
  // So I'll remove the description test.

  it('calls onDismiss when close button clicked', async () => {
    const onDismiss = vi.fn();
    renderWithProvider(
      <Toast
        toast={{ id: '1', message: 'Msg', type: 'info' }}
        onDismiss={onDismiss}
      />
    );

    const closeBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeBtn);

    // Toast has exit animation with 200ms delay
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledWith('1');
    });
  });

  it('renders with undo action', () => {
    const onUndo = vi.fn();
    renderWithProvider(
      <Toast
        toast={{
          id: '1',
          message: 'Dat deleted',
          type: 'success',
          action: { label: 'Undo', onClick: onUndo },
        }}
        onDismiss={vi.fn()}
      />
    );

    const undoBtn = screen.getByText('Undo');
    fireEvent.click(undoBtn);
    expect(onUndo).toHaveBeenCalled();
  });
});
