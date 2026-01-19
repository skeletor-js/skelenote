/**
 * Reduced motion preference hook
 *
 * Wraps framer-motion's useReducedMotion hook with additional utilities.
 * Used to respect user's accessibility preferences for reduced animation.
 */

import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';
import { type Transition } from 'framer-motion';

/**
 * Hook for detecting the user's reduced motion preference.
 *
 * Returns true if the user has enabled "Reduce Motion" in their OS settings.
 * When true, animations should be disabled or minimized.
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const reduceMotion = useReducedMotion();
 *   const transition = reduceMotion ? { duration: 0 } : springs.default;
 *
 *   return (
 *     <motion.div animate={{ scale: 1 }} transition={transition}>
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}

/**
 * Get a transition that respects reduced motion preference.
 *
 * @param transition - The desired transition when motion is allowed
 * @param reduceMotion - Whether reduced motion is enabled
 * @returns The original transition, or instant transition if reduced motion is enabled
 */
export function getAccessibleTransition(
  transition: Transition,
  reduceMotion: boolean
): Transition {
  if (reduceMotion) {
    return { duration: 0 };
  }
  return transition;
}
