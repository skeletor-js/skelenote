/**
 * HeaderAddButton - iOS-style add button for navigation headers
 *
 * Replaces FAB (Material Design pattern) with iOS Notes-style + button
 * positioned in the header's rightSection.
 *
 * Features:
 * - 44pt touch target (iOS minimum)
 * - Haptic feedback on tap
 * - Respects reduced motion preferences
 */

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ActionIcon } from '@mantine/core';
import { Plus, type LucideIcon } from 'lucide-react';
import { useHaptics, useReducedMotion } from '@/hooks';
import { springs } from '@/lib/animations';

interface HeaderAddButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Accessible label for the button */
  label: string;
  /** Icon to display (defaults to Plus) */
  icon?: LucideIcon;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * iOS-style add button for header navigation.
 * Use in MobileViewHeader's rightSection prop.
 *
 * @example
 * ```tsx
 * <MobileViewHeader
 *   title="Tasks"
 *   rightSection={
 *     <HeaderAddButton
 *       label="New task"
 *       onClick={handleNewTask}
 *     />
 *   }
 * />
 * ```
 */
export function HeaderAddButton({
  onClick,
  label,
  icon: Icon = Plus,
  disabled = false,
}: HeaderAddButtonProps) {
  const { impact } = useHaptics();
  const reduceMotion = useReducedMotion();

  const handleClick = useCallback(async () => {
    if (disabled) return;
    await impact('light');
    onClick();
  }, [onClick, disabled, impact]);

  const transition = reduceMotion ? { duration: 0 } : springs.snappy;

  return (
    <motion.div
      whileTap={!disabled && !reduceMotion ? { scale: 0.92 } : undefined}
      transition={transition}
    >
      <ActionIcon
        variant="subtle"
        color="ember"
        size={44}
        onClick={handleClick}
        disabled={disabled}
        aria-label={label}
        style={{
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Icon size={22} />
      </ActionIcon>
    </motion.div>
  );
}
