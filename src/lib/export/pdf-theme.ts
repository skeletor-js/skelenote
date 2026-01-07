/**
 * PDF Theme Configuration
 *
 * Light and dark theme colors for PDF export,
 * matching Skelenote's design system.
 */

export type PDFTheme = 'light' | 'dark';

/**
 * Color palette for PDF themes
 */
export interface PDFColors {
  /** Page background */
  background: string;
  /** Primary text */
  text: string;
  /** Secondary/muted text */
  textSecondary: string;
  /** Accent color for links, highlights */
  accent: string;
  /** Code block background */
  codeBg: string;
  /** Border color */
  border: string;
  /** Blockquote accent */
  blockquoteBorder: string;
  /** Checkbox checked fill */
  checkboxChecked: string;
  /** Checkbox unchecked border */
  checkboxUnchecked: string;
}

/**
 * Light theme colors (from style-guide.md)
 */
const lightColors: PDFColors = {
  background: '#FFFFFF',
  text: '#18181B', // Carbon
  textSecondary: '#52525B', // Graphite
  accent: '#B85C50', // Ember
  codeBg: '#F4F4F5',
  border: '#E4E4E7', // Vellum
  blockquoteBorder: '#B85C50', // Ember
  checkboxChecked: '#5E8C61', // Sage
  checkboxUnchecked: '#A1A1AA', // Stone
};

/**
 * Dark theme colors (inverted palette with boosted accents)
 */
const darkColors: PDFColors = {
  background: '#18181B',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  accent: '#D88A80', // Lighter ember for dark bg
  codeBg: '#27272A',
  border: '#27272A',
  blockquoteBorder: '#D88A80',
  checkboxChecked: '#7FB583', // Lighter sage for dark bg
  checkboxUnchecked: '#52525B',
};

/**
 * Get colors for a theme
 */
export function getThemeColors(theme: PDFTheme): PDFColors {
  return theme === 'dark' ? darkColors : lightColors;
}

/**
 * Typography configuration for PDF
 */
export const typography = {
  fontFamily: {
    sans: 'Helvetica',
    mono: 'Courier',
  },
  fontSize: {
    xs: 8,
    sm: 9,
    base: 10,
    md: 11,
    lg: 14,
    xl: 16,
    h1: 20,
    h2: 18,
    h3: 16,
    h4: 14,
    h5: 12,
    h6: 11,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.65,
  },
  fontWeight: {
    normal: 'normal' as const,
    bold: 'bold' as const,
  },
} as const;

/**
 * Spacing scale for PDF layout (in points)
 */
export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const;

/**
 * Page configuration
 */
export const pageConfig = {
  A4: {
    size: 'A4' as const,
    margin: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40,
    },
  },
  LETTER: {
    size: 'LETTER' as const,
    margin: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40,
    },
  },
} as const;

export type PageSize = keyof typeof pageConfig;
