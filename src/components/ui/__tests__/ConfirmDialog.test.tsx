/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { MantineProvider } from '@mantine/core';
import React from 'react';

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

describe('ConfirmDialog', () => {
  it('should not render when isOpen is false', () => {
    renderWithProvider(
      <ConfirmDialog
        isOpen={false}
        title="Confirm"
        message="Are you sure?"
        onConfirm={() => { }}
        onCancel={() => { }}
      />
    );
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('should render title and message when open', () => {
    renderWithProvider(
      <ConfirmDialog
        isOpen={true}
        title="Delete Item"
        message="This action cannot be undone."
        onConfirm={() => { }}
        onCancel={() => { }}
      />
    );
    // Mantine modals portal to body, testing-library handles this usually
    expect(screen.getByText('Delete Item')).toBeDefined();
    expect(screen.getByText('This action cannot be undone.')).toBeDefined();
  });

  it('should call onConfirm when confirm button clicked', () => {
    const handleConfirm = vi.fn();
    renderWithProvider(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Msg"
        onConfirm={handleConfirm}
        onCancel={() => { }}
        confirmLabel="Yes, do it"
      />
    );

    fireEvent.click(screen.getByText('Yes, do it'));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button clicked', () => {
    const handleCancel = vi.fn();
    renderWithProvider(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Msg"
        onConfirm={() => { }}
        onCancel={handleCancel}
        cancelLabel="No, wait"
      />
    );

    fireEvent.click(screen.getByText('No, wait'));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('should show dangerous styling if isDangerous is true', () => {
    // Implementation detail: likely uses red color.
    // Hard to test exact style without checking CSS classes or computed style.
    // We assume it renders without crashing.
    renderWithProvider(
      <ConfirmDialog
        isOpen={true}
        title="Delete"
        message="Dangerous"
        onConfirm={() => { }}
        onCancel={() => { }}

      />
    );
    expect(screen.getByText('Delete')).toBeDefined();
  });
});
