/**
 * EmptyState - Animated empty state with optional action
 *
 * Used when lists or views have no content to display.
 * Features:
 * - Fade-in animation on mount
 * - Optional action button
 * - Consistent styling across the app
 * - Respects reduced motion preferences
 */

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Stack, Text, Button } from '@mantine/core';
import { type LucideIcon, Inbox } from 'lucide-react';
import { tweens } from '@/lib/animations';
import { useReducedMotion } from '@/hooks';

interface EmptyStateProps {
  /** Icon to display (defaults to Inbox) */
  icon?: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button click handler */
  onAction?: () => void;
  /** Custom content to render instead of default layout */
  children?: ReactNode;
}

/**
 * EmptyState component for displaying when lists or views have no content.
 *
 * @example
 * ```tsx
 * // Simple empty state
 * <EmptyState
 *   icon={FileText}
 *   title="No notes yet"
 *   description="Create your first note to get started"
 *   actionLabel="Create note"
 *   onAction={handleCreate}
 * />
 *
 * // Without action
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your search terms"
 * />
 * ```
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion ? { duration: 0 } : tweens.slow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        minHeight: 200,
      }}
    >
      {children ?? (
        <Stack align="center" gap="md">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion ? { duration: 0 } : { delay: 0.1, ...tweens.normal }
            }
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'var(--mantine-color-gray-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={28} style={{ color: 'var(--mantine-color-gray-5)' }} />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { delay: 0.15, ...tweens.normal }
            }
          >
            <Text fw={600} size="md" ta="center">
              {title}
            </Text>
          </motion.div>

          {/* Description */}
          {description && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { delay: 0.2, ...tweens.normal }
              }
            >
              <Text size="sm" c="dimmed" ta="center" maw={280}>
                {description}
              </Text>
            </motion.div>
          )}

          {/* Action button */}
          {actionLabel && onAction && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { delay: 0.25, ...tweens.normal }
              }
            >
              <Button variant="light" color="ember" onClick={onAction} mt="xs">
                {actionLabel}
              </Button>
            </motion.div>
          )}
        </Stack>
      )}
    </motion.div>
  );
}
