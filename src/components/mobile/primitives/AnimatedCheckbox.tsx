/**
 * AnimatedCheckbox - Task completion with satisfying animation + haptics
 *
 * Features:
 * - Spring scale animation on check/uncheck
 * - Haptic feedback on toggle
 * - Respects reduced motion preferences
 * - Drop-in replacement for basic checkbox use cases
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mantine/core';
import { Check } from 'lucide-react';
import { springs } from '@/lib/animations';
import { useHaptics, useReducedMotion } from '@/hooks';

interface AnimatedCheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Size of the checkbox (default: 20) */
  size?: number;
  /** Disable the checkbox */
  disabled?: boolean;
  /** Color when checked (CSS color value) */
  checkedColor?: string;
  /** Border color when unchecked */
  uncheckedColor?: string;
  /** Accessible label */
  'aria-label'?: string;
}

export function AnimatedCheckbox({
  checked,
  onChange,
  size = 20,
  disabled = false,
  checkedColor = 'var(--mantine-color-sage-6)',
  uncheckedColor = 'var(--mantine-color-gray-4)',
  'aria-label': ariaLabel,
}: AnimatedCheckboxProps) {
  const { impact } = useHaptics();
  const reduceMotion = useReducedMotion();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;

      // Haptic feedback - fire-and-forget (parallel with visual change)
      // Don't await - haptic should not delay visual feedback
      impact(checked ? 'light' : 'medium');

      onChange(!checked);
    },
    [checked, onChange, disabled, impact]
  );

  const transition = reduceMotion ? { duration: 0 } : springs.snappy;

  // iOS minimum touch target is 44pt
  const touchTargetSize = 44;
  const padding = (touchTargetSize - size) / 2;

  return (
    <Box
      component="button"
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel ?? (checked ? 'Checked' : 'Unchecked')}
      disabled={disabled}
      onClick={handleClick}
      style={{
        width: touchTargetSize,
        height: touchTargetSize,
        padding,
        border: 'none',
        background: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Outer circle */}
      <motion.div
        initial={false}
        animate={{
          backgroundColor: checked ? checkedColor : 'transparent',
          borderColor: checked ? checkedColor : uncheckedColor,
          scale: checked ? 1 : 1,
        }}
        whileTap={!disabled ? { scale: 0.9 } : undefined}
        transition={transition}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `2px solid ${uncheckedColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Checkmark with AnimatePresence for mount/unmount animation */}
        <AnimatePresence mode="wait">
          {checked && (
            <motion.div
              key="checkmark"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={transition}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check
                size={size * 0.6}
                strokeWidth={3}
                style={{ color: 'white' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Scale pop effect on check */}
      <AnimatePresence>
        {checked && !reduceMotion && (
          <motion.div
            key="pop"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: checkedColor,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </Box>
  );
}
