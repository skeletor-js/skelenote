/**
 * FAB - Floating Action Button with animations + haptics
 *
 * Features:
 * - Spring animation on mount/unmount
 * - Hide/show based on scroll direction
 * - Haptic feedback on tap
 * - Respects reduced motion preferences
 */

import { useCallback, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, type LucideIcon } from 'lucide-react';
import {
  usePlatform,
  useHaptics,
  useReducedMotion,
  useScrollDirection,
} from '@/hooks';
import { springs } from '@/lib/animations';
import { TAB_BAR_HEIGHT } from '@/components/layout/BottomTabBar';

interface FABProps {
  /** Icon to display (defaults to Plus) */
  icon?: LucideIcon;
  /** Accessible label for the button */
  label?: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the FAB is visible (can be controlled externally) */
  visible?: boolean;
  /** Optional scroll container ref for auto-hide behavior */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Disable auto-hide on scroll (default: false) */
  disableScrollHide?: boolean;
}

/**
 * Floating Action Button for primary actions on mobile.
 * Positioned above the bottom tab bar with safe area consideration.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FAB onClick={handleCreate} label="Create task" />
 *
 * // With scroll hide behavior
 * <FAB
 *   onClick={handleCreate}
 *   scrollContainerRef={scrollRef}
 * />
 * ```
 */
export function FAB({
  icon: Icon = Plus,
  label = 'Create new',
  onClick,
  visible = true,
  scrollContainerRef,
  disableScrollHide = false,
}: FABProps) {
  const { safeAreaBottom } = usePlatform();
  const { impact } = useHaptics();
  const reduceMotion = useReducedMotion();

  // Scroll direction detection for auto-hide
  const { isVisible: scrollVisible } = useScrollDirection(
    scrollContainerRef ?? { current: null },
    { threshold: 10, hideAfter: 100 }
  );

  // Determine if FAB should be shown
  const shouldShow =
    visible && (disableScrollHide || !scrollContainerRef || scrollVisible);

  // Handle click with haptic feedback
  const handleClick = useCallback(async () => {
    await impact('light');
    onClick();
  }, [onClick, impact]);

  const transition = reduceMotion ? { duration: 0 } : springs.default;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.button
          type="button"
          onClick={handleClick}
          aria-label={label}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={transition}
          whileTap={!reduceMotion ? { scale: 0.92 } : undefined}
          style={{
            position: 'fixed',
            right: 16,
            bottom: TAB_BAR_HEIGHT + safeAreaBottom + 32,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'var(--mantine-color-ember-5, #B85C50)',
            boxShadow: '0 4px 12px rgba(184, 92, 80, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            zIndex: 99,
            // Prevent text selection on long press
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Icon size={24} color="white" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
