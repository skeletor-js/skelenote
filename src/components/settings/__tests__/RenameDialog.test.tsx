/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { RenameDialog } from '../RenameDialog';
import type { DeviceInfo } from '@/lib/devices';

// Mock matchMedia for Mantine
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

describe('RenameDialog', () => {
  const mockDevice: DeviceInfo = {
    deviceId: 'device-123',
    name: 'My MacBook',
    platform: 'macos',
    appVersion: '0.2.0',
    publicSigningKey: 'mock-signing-key',
    firstSeen: Date.now() - 86400000, // 1 day ago
    lastSeen: Date.now(),
    createdBy: 'device-origin',
    isCurrentDevice: true,
    status: 'connected',
    isRevoked: false,
  };

  const defaultProps = {
    device: mockDevice,
    isProcessing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  describe('rendering', () => {
    it('should render modal with title', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      expect(screen.getByText('Rename Device')).toBeDefined();
    });

    it('should render device name in input', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      const input = screen.getByDisplayValue('My MacBook');
      expect(input).toBeDefined();
    });

    it('should render Cancel button', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeDefined();
    });

    it('should render Save button', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      expect(screen.getByText('Save')).toBeDefined();
    });
  });

  describe('input handling', () => {
    it('should allow typing new name', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      const input = screen.getByDisplayValue('My MacBook') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Device Name' } });
      expect(input.value).toBe('New Device Name');
    });

    it('should disable input when processing', () => {
      renderWithProvider(
        <RenameDialog {...defaultProps} isProcessing={true} />
      );
      const input = screen.getByDisplayValue('My MacBook') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('button states', () => {
    it('should disable Save button when name unchanged', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      const saveButton = screen.getByText('Save').closest('button');
      // Mantine uses data-disabled attribute
      expect(saveButton?.getAttribute('data-disabled')).toBe('true');
    });

    it('should enable Save button when name changed', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.change(input, { target: { value: 'New Name' } });
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton?.getAttribute('data-disabled')).toBeNull();
    });

    it('should disable Save button when name is empty', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.change(input, { target: { value: '' } });
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton?.getAttribute('data-disabled')).toBe('true');
    });

    it('should disable Save button when name is whitespace only', () => {
      renderWithProvider(<RenameDialog {...defaultProps} />);
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.change(input, { target: { value: '   ' } });
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton?.getAttribute('data-disabled')).toBe('true');
    });

    it('should disable Cancel button when processing', () => {
      renderWithProvider(
        <RenameDialog {...defaultProps} isProcessing={true} />
      );
      const cancelButton = screen.getByText('Cancel').closest('button');
      expect(cancelButton?.getAttribute('data-disabled')).toBe('true');
    });

    it('should show loading state when processing', () => {
      renderWithProvider(
        <RenameDialog {...defaultProps} isProcessing={true} />
      );
      expect(screen.getByText('Saving...')).toBeDefined();
    });
  });

  describe('callback invocation', () => {
    it('should call onCancel when Cancel clicked', () => {
      const handleCancel = vi.fn();
      renderWithProvider(
        <RenameDialog {...defaultProps} onCancel={handleCancel} />
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with trimmed name when Save clicked', () => {
      const handleConfirm = vi.fn();
      renderWithProvider(
        <RenameDialog {...defaultProps} onConfirm={handleConfirm} />
      );
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.change(input, { target: { value: '  New Name  ' } });
      fireEvent.click(screen.getByText('Save'));
      expect(handleConfirm).toHaveBeenCalledWith('New Name');
    });

    it('should not call onConfirm if name unchanged', () => {
      const handleConfirm = vi.fn();
      renderWithProvider(
        <RenameDialog {...defaultProps} onConfirm={handleConfirm} />
      );
      // Try clicking save without changing the name (button should be disabled anyway)
      const saveButton = screen.getByText('Save') as HTMLButtonElement;
      if (!saveButton.disabled) {
        fireEvent.click(saveButton);
      }
      expect(handleConfirm).not.toHaveBeenCalled();
    });
  });

  describe('keyboard handling', () => {
    it('should submit on Enter key when valid', () => {
      const handleConfirm = vi.fn();
      renderWithProvider(
        <RenameDialog {...defaultProps} onConfirm={handleConfirm} />
      );
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleConfirm).toHaveBeenCalledWith('New Name');
    });

    it('should not submit on Enter when processing', () => {
      const handleConfirm = vi.fn();
      renderWithProvider(
        <RenameDialog
          {...defaultProps}
          onConfirm={handleConfirm}
          isProcessing={true}
        />
      );
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it('should not submit on Enter when name is empty', () => {
      const handleConfirm = vi.fn();
      renderWithProvider(
        <RenameDialog {...defaultProps} onConfirm={handleConfirm} />
      );
      const input = screen.getByDisplayValue('My MacBook');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleConfirm).not.toHaveBeenCalled();
    });
  });
});
