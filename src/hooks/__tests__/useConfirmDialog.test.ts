/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmDialog } from '../useConfirmDialog';

describe('useConfirmDialog', () => {
  describe('initial state', () => {
    it('should start with dialog closed', () => {
      const { result } = renderHook(() => useConfirmDialog());

      expect(result.current.dialogState.isOpen).toBe(false);
    });

    it('should have empty title and message', () => {
      const { result } = renderHook(() => useConfirmDialog());

      expect(result.current.dialogState.title).toBe('');
      expect(result.current.dialogState.message).toBe('');
    });

    it('should have null resolve function', () => {
      const { result } = renderHook(() => useConfirmDialog());

      expect(result.current.dialogState.resolve).toBeNull();
    });
  });

  describe('confirm', () => {
    it('should open dialog with provided options', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Delete Item',
          message: 'Are you sure you want to delete this item?',
        });
      });

      expect(result.current.dialogState.isOpen).toBe(true);
      expect(result.current.dialogState.title).toBe('Delete Item');
      expect(result.current.dialogState.message).toBe(
        'Are you sure you want to delete this item?'
      );
    });

    it('should include optional properties', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Confirm',
          message: 'Continue?',
          confirmLabel: 'Yes, continue',
          cancelLabel: 'No, go back',
          variant: 'danger',
        });
      });

      expect(result.current.dialogState.confirmLabel).toBe('Yes, continue');
      expect(result.current.dialogState.cancelLabel).toBe('No, go back');
      expect(result.current.dialogState.variant).toBe('danger');
    });

    it('should return a promise', () => {
      const { result } = renderHook(() => useConfirmDialog());

      let promise: Promise<boolean> | undefined;

      act(() => {
        promise = result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(promise).toBeInstanceOf(Promise);
    });

    it('should set resolve function in state', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.dialogState.resolve).toBeInstanceOf(Function);
    });
  });

  describe('handleConfirm', () => {
    it('should close the dialog when called', () => {
      const { result } = renderHook(() => useConfirmDialog());

      // Open dialog first
      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.dialogState.isOpen).toBe(true);

      // Confirm
      act(() => {
        result.current.handleConfirm();
      });

      expect(result.current.dialogState.isOpen).toBe(false);
    });

    it('should reset state to initial after confirm', () => {
      const { result } = renderHook(() => useConfirmDialog());

      // Open dialog first
      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      // Confirm
      act(() => {
        result.current.handleConfirm();
      });

      expect(result.current.dialogState.title).toBe('');
      expect(result.current.dialogState.message).toBe('');
      expect(result.current.dialogState.resolve).toBeNull();
    });
  });

  describe('handleCancel', () => {
    it('should close the dialog when called', () => {
      const { result } = renderHook(() => useConfirmDialog());

      // Open dialog first
      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.dialogState.isOpen).toBe(true);

      // Cancel
      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.dialogState.isOpen).toBe(false);
    });

    it('should reset state to initial after cancel', () => {
      const { result } = renderHook(() => useConfirmDialog());

      // Open dialog first
      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      // Cancel
      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.dialogState.title).toBe('');
      expect(result.current.dialogState.message).toBe('');
      expect(result.current.dialogState.resolve).toBeNull();
    });
  });

  describe('promise resolution', () => {
    it('should resolve with true when confirmed', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      let promise: Promise<boolean>;

      act(() => {
        promise = result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      const resolved = await promise!;
      expect(resolved).toBe(true);
    });

    it('should resolve with false when cancelled', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      let promise: Promise<boolean>;

      act(() => {
        promise = result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      act(() => {
        result.current.handleCancel();
      });

      const resolved = await promise!;
      expect(resolved).toBe(false);
    });
  });
});
