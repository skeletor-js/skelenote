/**
 * ConfirmDialog - Animated confirmation dialog with haptics
 *
 * Used for destructive actions like delete, archive, etc.
 * Features:
 * - Spring animation on open/close
 * - Haptic feedback for warning state
 * - Accessible with proper focus management
 * - Respects reduced motion preferences
 */

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Text, Button, Group, Stack } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { springs } from '@/lib/animations';
import { useHaptics, useReducedMotion } from '@/hooks';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  opened: boolean;
  /** Callback when dialog is closed (cancelled) */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Whether this is a destructive action (shows warning styling) */
  destructive?: boolean;
  /** Loading state for async confirmations */
  loading?: boolean;
}

export function ConfirmDialog({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const { notification } = useHaptics();
  const reduceMotion = useReducedMotion();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Trigger haptic when dialog opens with destructive warning
  useEffect(() => {
    if (opened && destructive) {
      notification('warning');
    }
  }, [opened, destructive, notification]);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (opened && confirmButtonRef.current) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [opened]);

  // Handle escape key
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, onClose, loading]);

  const handleConfirm = useCallback(async () => {
    if (loading) return;
    await notification(destructive ? 'warning' : 'success');
    onConfirm();
  }, [onConfirm, notification, destructive, loading]);

  const handleBackdropClick = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [onClose, loading]);

  const transition = reduceMotion ? { duration: 0 } : springs.gentle;

  return (
    <AnimatePresence>
      {opened && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={handleBackdropClick}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transition}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-message"
              style={{
                width: '100%',
                maxWidth: 320,
                backgroundColor: 'var(--surface-paper)',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Stack gap="md">
                {/* Icon and Title */}
                <Group gap="sm" wrap="nowrap">
                  {destructive && (
                    <Box
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'var(--mantine-color-brick-1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <AlertTriangle
                        size={20}
                        style={{ color: 'var(--mantine-color-brick-6)' }}
                      />
                    </Box>
                  )}
                  <Text id="confirm-dialog-title" fw={600} size="lg">
                    {title}
                  </Text>
                </Group>

                {/* Message */}
                <Text
                  id="confirm-dialog-message"
                  size="sm"
                  c="dimmed"
                  style={{ lineHeight: 1.5 }}
                >
                  {message}
                </Text>

                {/* Actions */}
                <Group gap="sm" mt="xs" grow>
                  <Button
                    variant="default"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    ref={confirmButtonRef}
                    color={destructive ? 'brick' : 'ember'}
                    onClick={handleConfirm}
                    loading={loading}
                  >
                    {confirmLabel}
                  </Button>
                </Group>
              </Stack>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for easy dialog state management
export interface UseConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface UseConfirmDialogReturn {
  /** Open the dialog and wait for user response */
  confirm: () => Promise<boolean>;
  /** Props to spread to ConfirmDialog component */
  dialogProps: {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  };
}
