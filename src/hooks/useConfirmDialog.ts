import { useCallback, useState } from 'react';
import type { ConfirmDialogVariant } from '@/components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

export interface ConfirmDialogState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export interface UseConfirmDialogResult {
  dialogState: ConfirmDialogState;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const initialState: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  resolve: null,
};

export function useConfirmDialog(): UseConfirmDialogResult {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(initialState);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState(initialState);
  }, [dialogState.resolve]);

  const handleCancel = useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState(initialState);
  }, [dialogState.resolve]);

  return {
    dialogState,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
