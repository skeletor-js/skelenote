/**
 * Animation utilities using framer-motion
 *
 * Provides consistent spring physics and animation variants
 * across desktop and mobile platforms.
 */

import { type Transition, type Variants } from 'framer-motion';

/**
 * Spring presets for consistent animation feel across the app.
 * All springs are tuned for a premium, native feel.
 */
export const springs = {
  /**
   * Snappy spring for small UI elements
   * Use for: checkboxes, buttons, toggles
   */
  snappy: {
    type: 'spring',
    stiffness: 500,
    damping: 30,
  } as Transition,

  /**
   * Default spring for balanced animations
   * Use for: FAB, cards, general UI transitions
   */
  default: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  } as Transition,

  /**
   * Gentle spring for larger elements
   * Use for: sheets, modals, large transitions
   */
  gentle: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,

  /**
   * Bouncy spring for celebratory animations
   * Use for: success states, achievements
   */
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
  } as Transition,

  /**
   * Stiff spring for rubber-band effects
   * Use for: swipe resistance, over-scroll
   */
  stiff: {
    type: 'spring',
    stiffness: 600,
    damping: 40,
  } as Transition,
} as const;

/**
 * Tween presets for non-spring animations
 */
export const tweens = {
  /** Fast tween for micro-interactions (150ms) */
  fast: {
    type: 'tween',
    duration: 0.15,
    ease: 'easeOut',
  } as Transition,

  /** Normal tween for standard transitions (200ms) */
  normal: {
    type: 'tween',
    duration: 0.2,
    ease: 'easeOut',
  } as Transition,

  /** Slow tween for deliberate animations (300ms) */
  slow: {
    type: 'tween',
    duration: 0.3,
    ease: 'easeOut',
  } as Transition,

  /** Exit tween with ease-in for leaving animations */
  exit: {
    type: 'tween',
    duration: 0.2,
    ease: 'easeIn',
  } as Transition,
} as const;

/**
 * Animation variants for common patterns
 */

/** Fade in with subtle upward motion */
export const fadeIn: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Scale in from center */
export const scaleIn: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

/** Slide up from bottom (for sheets) */
export const slideUp: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

/** Slide in from right (for drawers) */
export const slideInRight: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

/** Fade only (no motion) */
export const fadeOnly: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Checkbox check animation */
export const checkboxCheck: Variants = {
  unchecked: { scale: 1 },
  checked: {
    scale: [1, 1.2, 1],
    transition: springs.snappy,
  },
};

/** List item for AnimatePresence */
export const listItem: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: springs.default,
      opacity: tweens.fast,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: springs.default,
      opacity: tweens.exit,
    },
  },
};

/** FAB visibility animation */
export const fabVisibility: Variants = {
  visible: {
    scale: 1,
    y: 0,
    opacity: 1,
    transition: springs.default,
  },
  hidden: {
    scale: 0.8,
    y: 80,
    opacity: 0,
    transition: tweens.normal,
  },
};

/** Tab indicator animation */
export const tabIndicator = {
  transition: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
  } as Transition,
};

/**
 * Get a transition that respects reduced motion preference.
 * When reduced motion is enabled, returns instant transition.
 */
export function getTransition(
  transition: Transition,
  reducedMotion: boolean
): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return transition;
}

/**
 * Duration constants in milliseconds
 * (for use with setTimeout/setInterval, not framer-motion)
 */
export const durations = {
  instant: 100,
  fast: 150,
  normal: 200,
  slow: 300,
} as const;
