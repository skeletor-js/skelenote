/**
 * Mantine theme configuration for Skelenote
 * Minimal and clean aesthetic inspired by Linear, Notion, and Things
 */

import { createTheme, MantineColorsTuple, rem } from '@mantine/core';

/**
 * Custom color palettes mapped from existing design tokens
 * Each tuple has 10 shades from lightest to darkest
 */
// Foundation gray (zinc-based per style guide)
// These colors have a subtle cool undertone that works better in dark mode
const gray: MantineColorsTuple = [
  '#FAFAFA', // 0 - Canvas (lightest)
  '#F4F4F5', // 1
  '#E4E4E7', // 2 - Vellum (borders light mode)
  '#D4D4D8', // 3
  '#A1A1AA', // 4 - Stone (muted text, placeholders)
  '#71717A', // 5 - base
  '#52525B', // 6 - Graphite (secondary text)
  '#3F3F46', // 7
  '#27272A', // 8 - Vellum dark (borders dark mode)
  '#18181B', // 9 - Carbon (darkest, dark mode surfaces)
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
 * Custom Skelenote Design System Colors
 * Warm palette inspired by Linear's minimal aesthetic
 */

// Primary accent (Terracotta)
const ember: MantineColorsTuple = [
  '#FDF5F4', // 0
  '#F9E8E6', // 1
  '#F2CEC9', // 2
  '#E8ADA5', // 3
  '#D88A80', // 4
  '#B85C50', // 5 - Base
  '#A34D42', // 6
  '#8A3F36', // 7
  '#6E322B', // 8
  '#522520', // 9
];

// Secondary accent (Dusty mauve)
const clay: MantineColorsTuple = [
  '#FAF9FA', // 0
  '#F3F1F2', // 1
  '#E6E2E4', // 2
  '#D4CDD1', // 3
  '#BDB3B8', // 4
  '#9A8C98', // 5 - Base
  '#857780', // 6
  '#6E626A', // 7
  '#574E54', // 8
  '#403A3D', // 9
];

// Success (Muted green)
const sage: MantineColorsTuple = [
  '#F4F9F4', // 0
  '#E6F2E7', // 1
  '#C8E1CA', // 2
  '#A3CCA6', // 3
  '#7FB583', // 4
  '#5E8C61', // 5 - Base
  '#4F7652', // 6
  '#416043', // 7
  '#334A35', // 8
  '#243427', // 9
];

// Warning (Golden)
const ochre: MantineColorsTuple = [
  '#FFFBEB', // 0
  '#FEF3C7', // 1
  '#FDE68A', // 2
  '#FCD34D', // 3
  '#D4A60A', // 4
  '#B8860B', // 5 - Base
  '#9A7209', // 6
  '#7C5C07', // 7
  '#5E4606', // 8
  '#403004', // 9
];

// Error/Danger (Warm red)
const brick: MantineColorsTuple = [
  '#FDF5F5', // 0
  '#F9E6E6', // 1
  '#F0C7C7', // 2
  '#E3A1A1', // 3
  '#CE6F6F', // 4
  '#9B3D3D', // 5 - Base
  '#853434', // 6
  '#6E2B2B', // 7
  '#572222', // 8
  '#401919', // 9
];

// Links/Navigation (Cool slate)
const slate: MantineColorsTuple = [
  '#F8FAFC', // 0
  '#F1F5F9', // 1
  '#E2E8F0', // 2
  '#CBD5E1', // 3
  '#94A3B8', // 4
  '#64748B', // 5 - Blueprint base
  '#475569', // 6 - Slate/Link
  '#334155', // 7
  '#1E293B', // 8
  '#0F172A', // 9
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
    // Skelenote Design System colors
    ember,
    clay,
    sage,
    ochre,
    brick,
    slate,
  },
  primaryColor: 'ember',
  primaryShade: { light: 5, dark: 4 },

  // ===== CURSOR =====
  cursorType: 'pointer',

  // ===== FOCUS RING =====
  focusRing: 'auto',

  // ===== SURFACE COLORS =====
  // Custom semantic colors for surface hierarchy
  // Access via: theme.other.canvas, etc. or CSS var(--mantine-other-canvas)
  other: {
    // Near-black base layer (app background, sidebar)
    canvas: '#0A0A0A',
    // Elevated surface (cards, content areas) - same as gray.9
    paper: '#18181B',
    // Border color for dark mode - same as gray.8
    vellum: '#27272A',
    // Slightly brighter border for better visibility
    vellumBright: '#3F3F46',
  },

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
        size: 'xs',
      },
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    Checkbox: {
      defaultProps: {
        size: 'sm',
        radius: 'sm',
      },
      styles: {
        input: {
          borderWidth: '1.5px',
          '&:not(:checked)': {
            borderColor: 'var(--mantine-color-gray-3)',
          },
        },
      },
    },
    UnstyledButton: {
      styles: {
        root: {
          transition: 'background-color 150ms ease',
        },
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
