/**
 * Selection Toolbar
 * iOS-style full-width toolbar that replaces tab bar during selection mode.
 * Matches tab bar height (49px) and safe area handling.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import { X, MoreHorizontal } from 'lucide-react';
import { useReducedMotion } from '@/hooks';
import { springs } from '@/lib/animations';

// iOS standard tab bar height (must match BottomTabBar)
const TOOLBAR_HEIGHT = 49;

interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Whether to show the toolbar */
  visible: boolean;
  /** Callback when clear selection is pressed */
  onClear: () => void;
  /** Callback when actions menu is pressed */
  onActionsPress: () => void;
}

export function SelectionToolbar({
  count,
  visible,
  onClear,
  onActionsPress,
}: SelectionToolbarProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : springs.snappy;

  return (
    <AnimatePresence>
      {visible && count > 0 && (
        <motion.div
          initial={{ y: TOOLBAR_HEIGHT + 34, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: TOOLBAR_HEIGHT + 34, opacity: 0 }}
          transition={transition}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1001, // Above tab bar
          }}
        >
          <Box
            style={{
              minHeight: TOOLBAR_HEIGHT,
              paddingTop: 8,
              paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
              paddingLeft: 16,
              paddingRight: 16,
              backgroundColor: 'var(--surface-paper)',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Group justify="space-between" wrap="nowrap" style={{ flex: 1 }}>
              {/* Clear button */}
              <UnstyledButton
                onClick={onClear}
                aria-label="Clear selection"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  gap: 6,
                  color: 'var(--mantine-color-gray-6)',
                }}
              >
                <X size={18} />
                <Text size="sm">Clear</Text>
              </UnstyledButton>

              {/* Count - with aria-live for screen readers */}
              <Text
                size="sm"
                fw={600}
                c="dimmed"
                aria-live="polite"
                aria-atomic="true"
              >
                {count} selected
              </Text>

              {/* Actions button */}
              <UnstyledButton
                onClick={onActionsPress}
                aria-label="Actions menu"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  gap: 6,
                  color: 'var(--mantine-color-ember-6)',
                }}
              >
                <Text size="sm" fw={500}>
                  Actions
                </Text>
                <MoreHorizontal size={18} />
              </UnstyledButton>
            </Group>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
