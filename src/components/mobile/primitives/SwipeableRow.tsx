import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from 'react';
import { Box, UnstyledButton, Text } from '@mantine/core';
import {
  CheckCircle,
  Archive,
  Trash2,
  Pin,
  type LucideIcon,
} from 'lucide-react';

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
  /** Callback when row is long-pressed (600ms) */
  onLongPress?: () => void;
  /** Priority level for left border indicator */
  priority?: 'urgent' | 'high' | 'medium' | 'low' | null;
  /** Minimum row height */
  minHeight?: number;
  /** Disable swipe interactions */
  disabled?: boolean;
}

// Swipe thresholds in pixels
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 72;

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
}: SwipeableRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSwipingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxLeftSwipe = leftActions.length * ACTION_WIDTH;
  const maxRightSwipe = rightActions.length * ACTION_WIDTH;

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

      // Set up long press detection
      if (onLongPress) {
        longPressTimeoutRef.current = setTimeout(() => {
          if (!isSwipingRef.current) {
            onLongPress();
            touchStartRef.current = null;
          }
        }, 600);
      }
    },
    [disabled, onLongPress]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
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
        // Clamp the offset to valid range
        let newOffset = deltaX;
        if (newOffset > 0) {
          newOffset = Math.min(newOffset, maxLeftSwipe);
        } else {
          newOffset = Math.max(newOffset, -maxRightSwipe);
        }
        setSwipeOffset(newOffset);
      }
    },
    [disabled, maxLeftSwipe, maxRightSwipe]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    if (!touchStartRef.current) {
      setIsAnimating(true);
      setSwipeOffset(0);
      setTimeout(() => setIsAnimating(false), 200);
      return;
    }

    const wasSwiping = isSwipingRef.current;

    // Check if this was a tap (not a swipe)
    if (!wasSwiping && onPress) {
      onPress();
    }

    // Handle swipe action trigger
    if (wasSwiping) {
      setIsAnimating(true);

      if (swipeOffset > SWIPE_THRESHOLD && leftActions.length > 0) {
        // Trigger the first left action (revealed on right swipe)
        leftActions[0].onAction();
      } else if (swipeOffset < -SWIPE_THRESHOLD && rightActions.length > 0) {
        // Trigger the first right action (revealed on left swipe)
        rightActions[0].onAction();
      }

      // Animate back to closed position
      setSwipeOffset(0);
      setTimeout(() => setIsAnimating(false), 200);
    }

    touchStartRef.current = null;
    isSwipingRef.current = false;
  }, [swipeOffset, leftActions, rightActions, onPress]);

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
                <Icon size={20} color="white" />
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
                <Icon size={20} color="white" />
                <Text size="xs" c="white" fw={500}>
                  {action.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Box>
      )}

      {/* Main content */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight,
          padding: '16px',
          backgroundColor: 'var(--surface-paper)',
          borderBottom: '1px solid var(--border-subtle)',
          borderLeft: priorityBorderColor
            ? `3px solid ${priorityBorderColor}`
            : 'none',
          transform: `translateX(${swipeOffset}px)`,
          transition: isAnimating ? 'transform 200ms ease-out' : 'none',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// Re-export commonly used icons for convenience
export { CheckCircle, Archive, Trash2, Pin };
