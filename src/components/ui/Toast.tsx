import { useEffect, useState } from 'react';
import { Paper, Group, Text, CloseButton, Button, MantineColor } from '@mantine/core';
import { Icon } from './Icon';
import type { Toast as ToastData, ToastType } from '@/contexts/ToastContext';
import type { IconName } from '@/lib/icons';

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 10000;

function getDefaultDuration(type: ToastType): number {
  return type === 'error' ? ERROR_DURATION : DEFAULT_DURATION;
}

/**
 * Get icon name for toast type
 */
function getIconName(type: ToastType): IconName {
  switch (type) {
    case 'success':
      return 'check-circle';
    case 'error':
      return 'x';
    case 'warning':
      return 'alert-triangle';
    case 'info':
    default:
      return 'info';
  }
}

/**
 * Get color for toast type
 */
function getColor(type: ToastType): MantineColor {
  switch (type) {
    case 'success':
      return 'green';
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
    default:
      return 'blue';
  }
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration ?? getDefaultDuration(toast.type);
  const color = getColor(toast.type);
  const iconName = getIconName(toast.type);

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
    <Paper
      shadow="md"
      p="sm"
      radius="sm"
      withBorder
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      style={{
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        borderLeftWidth: 3,
        borderLeftColor: `var(--mantine-color-${color}-6)`,
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Icon
          name={iconName}
          size={18}
          color={`var(--mantine-color-${color}-6)`}
        />
        <Text size="sm" style={{ flex: 1 }}>
          {toast.message}
        </Text>
        {toast.action && (
          <Button
            variant="subtle"
            size="compact-xs"
            color={color}
            onClick={handleActionClick}
          >
            {toast.action.label}
          </Button>
        )}
        <CloseButton
          size="sm"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        />
      </Group>
    </Paper>
  );
}
