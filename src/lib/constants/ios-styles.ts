/**
 * iOS Human Interface Guidelines style constants
 * Adapted for Skelenote's "Cozy Rationalism" aesthetic
 */

/**
 * iOS-standard chevron specs with Skelenote color adaptation
 * Size and strokeWidth follow iOS precisely, colors use warmer Stone instead of iOS gray
 */
export const IOS_CHEVRON = {
  /** Disclosure chevrons (forward navigation, drill-down) */
  disclosure: {
    size: 14,
    color: '#A1A1AA', // Skelenote Stone (warmer than iOS #C7C7CC)
    strokeWidth: 2.5,
  },
  /** Back chevrons (return navigation) - uses tint color */
  back: {
    size: 14,
    color: 'var(--mantine-color-ember-6)',
    strokeWidth: 2.5,
  },
} as const;

/**
 * iOS standard touch target size
 * All interactive elements should be at least this size
 */
export const IOS_TOUCH_TARGET = 44;

/**
 * iOS standard timing values
 */
export const IOS_TIMING = {
  /** Long press duration in ms */
  longPress: 500,
  /** Standard animation duration */
  animation: 300,
  /** Fast animation duration */
  animationFast: 150,
} as const;

/**
 * iOS standard tab bar height (excluding safe area)
 */
export const IOS_TAB_BAR_HEIGHT = 49;
