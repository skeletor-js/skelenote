import { Portal, Stack } from '@mantine/core';
import { useToast } from '@/contexts/ToastContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <Portal>
      <Stack
        gap="sm"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
          maxWidth: 380,
          width: '100%',
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </Stack>
    </Portal>
  );
}
