/**
 * Mantine theme configuration for Skelenote
 * Minimal and clean aesthetic inspired by Linear, Notion, and Things
 */

import { createTheme, MantineColorsTuple, rem } from '@mantine/core';

/**
 * Custom color palettes mapped from existing design tokens
 * Each tuple has 10 shades from lightest to darkest
 */
const gray: MantineColorsTuple = [
  '#fafafa', // 0 - lightest
  '#f5f5f5', // 1
  '#e5e5e5', // 2
  '#d4d4d4', // 3
  '#a3a3a3', // 4
  '#737373', // 5 - base
  '#525252', // 6
  '#404040', // 7
  '#262626', // 8
  '#171717', // 9 - darkest
];

const red: MantineColorsTuple = [
  '#fef2f2',
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444', // 5 - base (matches --tag-red dark)
  '#dc2626', // 6 - (matches --tag-red light)
  '#b91c1c',
  '#991b1b',
  '#7f1d1d',
];

const orange: MantineColorsTuple = [
  '#fff7ed',
  '#ffedd5',
  '#fed7aa',
  '#fdba74',
  '#fb923c',
  '#f97316', // 5 - base
  '#ea580c', // 6
  '#c2410c',
  '#9a3412',
  '#7c2d12',
];

const yellow: MantineColorsTuple = [
  '#fefce8',
  '#fef9c3',
  '#fef08a',
  '#fde047',
  '#facc15',
  '#eab308', // 5 - base
  '#ca8a04', // 6
  '#a16207',
  '#854d0e',
  '#713f12',
];

const green: MantineColorsTuple = [
  '#f0fdf4',
  '#dcfce7',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e', // 5 - base
  '#16a34a', // 6
  '#15803d',
  '#166534',
  '#14532d',
];

const blue: MantineColorsTuple = [
  '#eff6ff',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6', // 5 - base
  '#2563eb', // 6
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
];

const violet: MantineColorsTuple = [
  '#faf5ff',
  '#f3e8ff',
  '#e9d5ff',
  '#d8b4fe',
  '#c084fc',
  '#a855f7', // 5 - base
  '#9333ea', // 6
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
];

const pink: MantineColorsTuple = [
  '#fdf2f8',
  '#fce7f3',
  '#fbcfe8',
  '#f9a8d4',
  '#f472b6',
  '#ec4899', // 5 - base
  '#db2777', // 6
  '#be185d',
  '#9d174d',
  '#831843',
];

const cyan: MantineColorsTuple = [
  '#ecfeff',
  '#cffafe',
  '#a5f3fc',
  '#67e8f9',
  '#22d3ee',
  '#06b6d4', // 5 - base
  '#0891b2', // 6
  '#0e7490',
  '#155e75',
  '#164e63',
];

/**
 * Skelenote Mantine Theme
 * Designed for a minimal, professional aesthetic
 */
export const theme = createTheme({
  // ===== TYPOGRAPHY =====
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"Fragment Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  // Font sizes matching existing design tokens
  fontSizes: {
    xs: rem(11),
    sm: rem(12),
    md: rem(14),
    lg: rem(16),
    xl: rem(18),
  },

  // Line heights
  lineHeights: {
    xs: '1.25',
    sm: '1.35',
    md: '1.5',
    lg: '1.55',
    xl: '1.65',
  },

  // ===== SPACING =====
  // Matching existing tokens.css values
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // ===== BORDER RADIUS =====
  // Minimal aesthetic with subtle rounding
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  defaultRadius: 'sm',

  // ===== SHADOWS =====
  // Subtle shadows for minimal aesthetic
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.08)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },

  // ===== COLORS =====
  colors: {
    gray,
    red,
    orange,
    yellow,
    green,
    blue,
    violet,
    pink,
    cyan,
  },
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 5 },

  // ===== CURSOR =====
  cursorType: 'pointer',

  // ===== FOCUS RING =====
  focusRing: 'auto',

  // ===== COMPONENT DEFAULTS =====
  // Overrides for minimal aesthetic
  components: {
    Button: {
      defaultProps: {
        variant: 'subtle',
        size: 'sm',
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        variant: 'subtle',
        color: 'gray',
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'none',
        withBorder: true,
      },
    },
    Card: {
      defaultProps: {
        shadow: 'none',
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.35,
          blur: 2,
        },
      },
      styles: {
        title: {
          fontWeight: 600,
        },
      },
    },
    Input: {
      defaultProps: {
        size: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    NumberInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
    Menu: {
      styles: {
        dropdown: {
          padding: rem(4),
        },
        item: {
          fontSize: rem(13),
          padding: `${rem(6)} ${rem(10)}`,
        },
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: rem(4),
        },
        label: {
          fontSize: rem(13),
        },
      },
    },
    Badge: {
      defaultProps: {
        variant: 'light',
        size: 'sm',
      },
    },
    Checkbox: {
      defaultProps: {
        size: 'sm',
        radius: 'xl',
      },
    },
    Tooltip: {
      defaultProps: {
        withArrow: true,
        arrowSize: 6,
      },
      styles: {
        tooltip: {
          fontSize: rem(12),
        },
      },
    },
    Notification: {
      styles: {
        root: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});
