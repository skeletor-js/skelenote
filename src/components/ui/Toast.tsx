import { useEffect, useState } from 'react';
import type { Toast as ToastData, ToastType } from '@/contexts/ToastContext';
import './Toast.css';

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 10000;

function getDefaultDuration(type: ToastType): number {
  return type === 'error' ? ERROR_DURATION : DEFAULT_DURATION;
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '\u2713'; // checkmark
    case 'error':
      return '\u2717'; // x mark
    case 'warning':
      return '\u26A0'; // warning triangle
    case 'info':
    default:
      return '\u2139'; // info circle
  }
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration ?? getDefaultDuration(toast.type);

  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for exit animation
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  };

  const handleActionClick = () => {
    toast.action?.onClick();
    handleDismiss();
  };

  return (
    <div
      className={`toast toast--${toast.type} ${isExiting ? 'toast--exiting' : ''}`}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast__icon" aria-hidden="true">
        {getIcon(toast.type)}
      </span>
      <span className="toast__message">{toast.message}</span>
      {toast.action && (
        <button
          className="toast__action"
          onClick={handleActionClick}
          type="button"
        >
          {toast.action.label}
        </button>
      )}
      <button
        className="toast__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        \u00D7
      </button>
    </div>
  );
}
