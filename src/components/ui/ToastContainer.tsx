import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
import { Toast } from './Toast';
import './ToastContainer.css';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
}
