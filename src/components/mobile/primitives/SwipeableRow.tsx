/**
 * SwipeableRow - Swipeable list item with rubber-band effect + haptics
 *
 * Features:
 * - Spring physics rubber-band on over-swipe
 * - Haptic feedback at threshold crossing
 * - Smooth spring animation back to rest
 * - Respects reduced motion preferences
 */

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from 'react';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';
import { Box, UnstyledButton, Text } from '@mantine/core';
import {
  CheckCircle,
  Archive,
  Trash2,
  Pin,
  type LucideIcon,
} from 'lucide-react';
import { useHaptics, useReducedMotion } from '@/hooks';

export interface SwipeAction {
  id: string;
  icon: LucideIcon;
  label: string;
  color: 'sage' | 'ember' | 'brick' | 'gray';
  onAction: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Actions revealed on right swipe (typically positive actions like complete) */
  leftActions?: SwipeAction[];
  /** Actions revealed on left swipe (typically negative actions like delete) */
  rightActions?: SwipeAction[];
  /** Callback when row is tapped */
  onPress?: () => void;
  /** Callback when row is long-pressed (500ms per iOS HIG) */
  onLongPress?: () => void;
  /** Priority level for left border indicator */
  priority?: 'urgent' | 'high' | 'medium' | 'low' | null;
  /** Minimum row height */
  minHeight?: number;
  /** Disable swipe interactions */
  disabled?: boolean;
  /** Additional style for the row content */
  style?: React.CSSProperties;
  /** Separator inset from left edge (iOS standard is 16px) */
  separatorInset?: number;
  /** Hide bottom separator */
  hideSeparator?: boolean;
}

// Swipe thresholds in pixels
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 72;
// Rubber-band resistance factor (higher = more resistance)
const RUBBER_BAND_FACTOR = 0.3;

// Color mapping for actions (using darker shades for WCAG AA contrast with white text)
const colorMap: Record<string, string> = {
  sage: 'var(--mantine-color-sage-6, #4A7A4D)',
  ember: 'var(--mantine-color-ember-6, #A04D42)',
  brick: 'var(--mantine-color-brick-6, #852E2E)',
  gray: 'var(--mantine-color-gray-6, #52525B)',
};

// Priority border colors
const priorityColorMap: Record<string, string> = {
  urgent: 'var(--mantine-color-brick-5, #9B3D3D)',
  high: 'var(--mantine-color-ember-5, #B85C50)',
  medium: 'var(--mantine-color-ochre-5, #B8860B)',
  low: 'var(--mantine-color-slate-5, #64748B)',
};

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  onPress,
  onLongPress,
  priority,
  minHeight = 64,
  disabled = false,
  style,
  separatorInset = 16, // iOS standard inset
  hideSeparator = false,
}: SwipeableRowProps) {
  const { impact } = useHaptics();
  const reduceMotion = useReducedMotion();

  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSwipingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Framer-motion spring for smooth rubber-band effect
  const x = useMotionValue(0);
  const springX = useSpring(x, {
    stiffness: reduceMotion ? 1000 : 600,
    damping: reduceMotion ? 100 : 40,
  });

  const maxLeftSwipe = leftActions.length * ACTION_WIDTH;
  const maxRightSwipe = rightActions.length * ACTION_WIDTH;

  // Calculate rubber-band offset for over-swipe
  const getRubberbandOffset = useCallback(
    (delta: number) => {
      if (delta > 0) {
        // Swiping right
        if (delta <= maxLeftSwipe) {
          return delta;
        }
        // Over-swipe: apply rubber-band effect
        const overSwipe = delta - maxLeftSwipe;
        return maxLeftSwipe + overSwipe * RUBBER_BAND_FACTOR;
      } else {
        // Swiping left
        if (delta >= -maxRightSwipe) {
          return delta;
        }
        // Over-swipe: apply rubber-band effect
        const overSwipe = Math.abs(delta) - maxRightSwipe;
        return -(maxRightSwipe + overSwipe * RUBBER_BAND_FACTOR);
      }
    },
    [maxLeftSwipe, maxRightSwipe]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isSwipingRef.current = false;
      setHasTriggeredHaptic(false);

      // Set up long press detection
      if (onLongPress) {
        longPressTimeoutRef.current = setTimeout(async () => {
          if (!isSwipingRef.current) {
            await impact('heavy');
            onLongPress();
            touchStartRef.current = null;
          }
        }, 500); // iOS standard: 500ms
      }
    },
    [disabled, onLongPress, impact]
  );

  const handleTouchMove = useCallback(
    async (e: TouchEvent) => {
      if (disabled || !touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // If moving more vertically than horizontally, cancel swipe
      if (Math.abs(deltaY) > Math.abs(deltaX) && !isSwipingRef.current) {
        touchStartRef.current = null;
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }
        return;
      }

      // Start swiping if horizontal movement exceeds threshold
      if (Math.abs(deltaX) > 10) {
        isSwipingRef.current = true;
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }
      }

      if (isSwipingRef.current) {
        const newOffset = getRubberbandOffset(deltaX);
        x.set(newOffset);

        // Trigger haptic when crossing threshold (only once per swipe)
        if (!hasTriggeredHaptic) {
          const crossedThreshold =
            (deltaX > SWIPE_THRESHOLD && leftActions.length > 0) ||
            (deltaX < -SWIPE_THRESHOLD && rightActions.length > 0);

          if (crossedThreshold) {
            await impact('light');
            setHasTriggeredHaptic(true);
          }
        }
      }
    },
    [
      disabled,
      getRubberbandOffset,
      x,
      hasTriggeredHaptic,
      leftActions.length,
      rightActions.length,
      impact,
    ]
  );

  const handleTouchEnd = useCallback(async () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    if (!touchStartRef.current) {
      // Animate back to rest
      animate(x, 0, {
        type: reduceMotion ? 'tween' : 'spring',
        stiffness: 600,
        damping: 40,
        duration: reduceMotion ? 0 : undefined,
      });
      return;
    }

    const wasSwiping = isSwipingRef.current;
    const currentOffset = x.get();

    // Check if this was a tap (not a swipe)
    if (!wasSwiping && onPress) {
      onPress();
    }

    // Handle swipe action trigger
    if (wasSwiping) {
      if (currentOffset > SWIPE_THRESHOLD && leftActions.length > 0) {
        // Trigger with haptic feedback
        await impact('medium');
        leftActions[0].onAction();
      } else if (currentOffset < -SWIPE_THRESHOLD && rightActions.length > 0) {
        await impact('medium');
        rightActions[0].onAction();
      }

      // Animate back to closed position with spring
      animate(x, 0, {
        type: reduceMotion ? 'tween' : 'spring',
        stiffness: 600,
        damping: 40,
        duration: reduceMotion ? 0 : undefined,
      });
    }

    touchStartRef.current = null;
    isSwipingRef.current = false;
    setHasTriggeredHaptic(false);
  }, [x, leftActions, rightActions, onPress, impact, reduceMotion]);

  const priorityBorderColor = priority ? priorityColorMap[priority] : undefined;

  return (
    <Box
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight,
        touchAction: 'pan-y',
      }}
    >
      {/* Left action slots (revealed on right swipe) */}
      {leftActions.length > 0 && (
        <Box
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            transform: `translateX(${-maxLeftSwipe}px)`,
          }}
        >
          {leftActions.map((action) => {
            const Icon = action.icon;
            return (
              <UnstyledButton
                key={action.id}
                onClick={action.onAction}
                aria-label={action.label}
                style={{
                  width: ACTION_WIDTH,
                  height: '100%',
                  backgroundColor: colorMap[action.color],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Icon size={20} color="white" aria-hidden="true" />
                <Text size="xs" c="white" fw={500}>
                  {action.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Box>
      )}

      {/* Right action slots (revealed on left swipe) */}
      {rightActions.length > 0 && (
        <Box
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            transform: `translateX(${maxRightSwipe}px)`,
          }}
        >
          {rightActions.map((action) => {
            const Icon = action.icon;
            return (
              <UnstyledButton
                key={action.id}
                onClick={action.onAction}
                aria-label={action.label}
                style={{
                  width: ACTION_WIDTH,
                  height: '100%',
                  backgroundColor: colorMap[action.color],
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Icon size={20} color="white" aria-hidden="true" />
                <Text size="xs" c="white" fw={500}>
                  {action.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Box>
      )}

      {/* Main content with spring-animated transform */}
      <motion.div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          x: springX,
          display: 'flex',
          alignItems: 'center',
          minHeight,
          padding: '16px',
          backgroundColor: 'var(--surface-paper)',
          borderLeft: priorityBorderColor
            ? `3px solid ${priorityBorderColor}`
            : 'none',
          cursor: disabled ? 'default' : 'pointer',
          position: 'relative',
          ...style,
        }}
      >
        {children}
        {/* iOS-style inset separator */}
        {!hideSeparator && (
          <Box
            style={{
              position: 'absolute',
              bottom: 0,
              left: separatorInset,
              right: 0,
              height: 1,
              backgroundColor: 'var(--border-subtle)',
            }}
          />
        )}
      </motion.div>
    </Box>
  );
}

// Re-export commonly used icons for convenience
export { CheckCircle, Archive, Trash2, Pin };
