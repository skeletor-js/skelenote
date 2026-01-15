import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from 'react';
import { Box, Loader } from '@mantine/core';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  /** Callback when refresh is triggered. Should return a promise. */
  onRefresh: () => Promise<void>;
  /** Whether currently refreshing (controlled externally) */
  isRefreshing?: boolean;
  /** Pull distance threshold to trigger refresh */
  threshold?: number;
  /** Disable pull to refresh */
  disabled?: boolean;
}

const DEFAULT_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

/**
 * Pull-to-refresh wrapper for mobile list views.
 * Provides visual feedback during pull and triggers refresh callback.
 */
export function PullToRefresh({
  children,
  onRefresh,
  isRefreshing: externalIsRefreshing,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartRef = useRef<{ y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPullingRef = useRef(false);

  const refreshing = externalIsRefreshing ?? isRefreshing;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing) return;

      // Only allow pull when scrolled to top
      const scrollTop = contentRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) return;

      touchStartRef.current = { y: e.touches[0].clientY };
      isPullingRef.current = false;
    },
    [disabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing || !touchStartRef.current) return;

      const scrollTop = contentRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) {
        touchStartRef.current = null;
        return;
      }

      const deltaY = e.touches[0].clientY - touchStartRef.current.y;

      // Only handle downward pull
      if (deltaY > 0) {
        isPullingRef.current = true;
        // Apply resistance to pull
        const resistance = 0.5;
        const newDistance = Math.min(deltaY * resistance, MAX_PULL_DISTANCE);
        setPullDistance(newDistance);

        // Prevent default scroll behavior when pulling
        if (newDistance > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) {
      touchStartRef.current = null;
      return;
    }

    if (pullDistance >= threshold && !refreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      setIsAnimating(true);
      setPullDistance(60); // Hold at indicator position

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    // Animate back to zero
    setIsAnimating(true);
    setPullDistance(0);
    setTimeout(() => setIsAnimating(false), 300);

    touchStartRef.current = null;
    isPullingRef.current = false;
  }, [pullDistance, threshold, refreshing, onRefresh]);

  // Calculate rotation based on pull distance
  const rotation = Math.min(pullDistance * 3, 360);
  const isReady = pullDistance >= threshold;

  return (
    <Box
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Pull indicator */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Math.max(pullDistance, 0),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface-canvas)',
          overflow: 'hidden',
          transition: isAnimating ? 'height 300ms ease-out' : 'none',
        }}
      >
        {refreshing ? (
          <Loader size="sm" color="ember" />
        ) : (
          <RefreshCw
            size={20}
            style={{
              color: isReady
                ? 'var(--mantine-color-ember-5)'
                : 'var(--mantine-color-gray-5)',
              transform: `rotate(${rotation}deg)`,
              transition: isAnimating ? 'transform 300ms ease-out' : 'none',
            }}
          />
        )}
      </Box>

      {/* Content wrapper */}
      <Box
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          height: '100%',
          overflow: 'auto',
          transform: `translateY(${pullDistance}px)`,
          transition: isAnimating ? 'transform 300ms ease-out' : 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
