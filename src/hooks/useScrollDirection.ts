/**
 * Scroll direction detection hook
 *
 * Detects whether the user is scrolling up or down in a container.
 * Useful for hiding/showing FABs and toolbars based on scroll direction.
 */

import { useState, useEffect, useRef, type RefObject } from 'react';

export type ScrollDirection = 'up' | 'down' | null;

export interface UseScrollDirectionOptions {
  /** Minimum scroll delta (in px) to trigger direction change. Default: 10 */
  threshold?: number;
  /** Minimum scroll position before hiding starts. Default: 100 */
  hideAfter?: number;
  /** Initial direction. Default: null */
  initialDirection?: ScrollDirection;
}

export interface UseScrollDirectionResult {
  /** Current scroll direction: 'up', 'down', or null */
  direction: ScrollDirection;
  /** Current scroll position in pixels */
  scrollY: number;
  /** Whether FAB/toolbar should be visible (false when scrolling down past threshold) */
  isVisible: boolean;
}

/**
 * Hook for detecting scroll direction in a container.
 *
 * @param containerRef - Ref to the scrollable container element
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function ListView() {
 *   const scrollRef = useRef<HTMLDivElement>(null);
 *   const { isVisible } = useScrollDirection(scrollRef);
 *
 *   return (
 *     <>
 *       <div ref={scrollRef} style={{ overflow: 'auto' }}>
 *         {items.map(item => <Item key={item.id} />)}
 *       </div>
 *       <FAB visible={isVisible} />
 *     </>
 *   );
 * }
 * ```
 */
export function useScrollDirection(
  containerRef: RefObject<HTMLElement | null>,
  options: UseScrollDirectionOptions = {}
): UseScrollDirectionResult {
  const { threshold = 10, hideAfter = 100, initialDirection = null } = options;

  const [direction, setDirection] = useState<ScrollDirection>(initialDirection);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      // Only trigger on significant scroll
      if (Math.abs(delta) > threshold) {
        setDirection(delta > 0 ? 'down' : 'up');
        lastScrollY.current = currentScrollY;
      }

      setScrollY(currentScrollY);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, threshold]);

  // Determine visibility: show when scrolling up OR when near top
  const isVisible = direction !== 'down' || scrollY < hideAfter;

  return { direction, scrollY, isVisible };
}
