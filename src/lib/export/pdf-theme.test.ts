/**
 * Tests for PDF Theme Configuration
 *
 * Covers theme color palettes, typography, spacing, and page configuration.
 */

import { describe, it, expect } from 'vitest';
import {
  getThemeColors,
  typography,
  spacing,
  pageConfig,
  type PDFTheme,
  type PDFColors,
} from './pdf-theme';

describe('PDF Theme', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Theme Colors
  // ─────────────────────────────────────────────────────────────────────────

  describe('getThemeColors', () => {
    it('returns light theme colors for "light" theme', () => {
      const colors = getThemeColors('light');

      expect(colors.background).toBe('#FFFFFF');
      expect(colors.text).toBe('#18181B'); // Carbon
      expect(colors.textSecondary).toBe('#52525B'); // Graphite
      expect(colors.accent).toBe('#B85C50'); // Ember
    });

    it('returns dark theme colors for "dark" theme', () => {
      const colors = getThemeColors('dark');

      expect(colors.background).toBe('#18181B');
      expect(colors.text).toBe('#FAFAFA');
      expect(colors.textSecondary).toBe('#A1A1AA');
      expect(colors.accent).toBe('#D88A80'); // Lighter ember
    });

    it('light theme has all required color properties', () => {
      const colors = getThemeColors('light');

      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textSecondary');
      expect(colors).toHaveProperty('accent');
      expect(colors).toHaveProperty('codeBg');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('blockquoteBorder');
      expect(colors).toHaveProperty('checkboxChecked');
      expect(colors).toHaveProperty('checkboxUnchecked');
    });

    it('dark theme has all required color properties', () => {
      const colors = getThemeColors('dark');

      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textSecondary');
      expect(colors).toHaveProperty('accent');
      expect(colors).toHaveProperty('codeBg');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('blockquoteBorder');
      expect(colors).toHaveProperty('checkboxChecked');
      expect(colors).toHaveProperty('checkboxUnchecked');
    });

    it('light theme uses Skelenote design system colors', () => {
      const colors = getThemeColors('light');

      // From style-guide.md
      expect(colors.text).toBe('#18181B'); // Carbon
      expect(colors.textSecondary).toBe('#52525B'); // Graphite
      expect(colors.accent).toBe('#B85C50'); // Ember
      expect(colors.border).toBe('#E4E4E7'); // Vellum
      expect(colors.checkboxChecked).toBe('#5E8C61'); // Sage
      expect(colors.checkboxUnchecked).toBe('#A1A1AA'); // Stone
    });

    it('dark theme uses inverted palette with boosted accents', () => {
      const colors = getThemeColors('dark');

      // Dark background
      expect(colors.background).toBe('#18181B');

      // Lighter text
      expect(colors.text).toBe('#FAFAFA');

      // Boosted accent colors for contrast
      expect(colors.accent).toBe('#D88A80'); // Lighter than light theme
      expect(colors.checkboxChecked).toBe('#7FB583'); // Lighter sage
    });

    it('code background is distinct from page background', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.codeBg).not.toBe(lightColors.background);
      expect(darkColors.codeBg).not.toBe(darkColors.background);
    });

    it('blockquote border matches accent color', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.blockquoteBorder).toBe(lightColors.accent);
      expect(darkColors.blockquoteBorder).toBe(darkColors.accent);
    });

    it('returns different objects for each theme', () => {
      const light = getThemeColors('light');
      const dark = getThemeColors('dark');

      // Should be different objects
      expect(light).not.toBe(dark);

      // Should have different values
      expect(light.background).not.toBe(dark.background);
      expect(light.text).not.toBe(dark.text);
    });

    it('handles theme parameter correctly', () => {
      const themes: PDFTheme[] = ['light', 'dark'];

      themes.forEach((theme) => {
        const colors = getThemeColors(theme);
        expect(colors).toBeDefined();
        expect(typeof colors).toBe('object');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Typography
  // ─────────────────────────────────────────────────────────────────────────

  describe('typography', () => {
    it('defines font families', () => {
      expect(typography.fontFamily.sans).toBe('Helvetica');
      expect(typography.fontFamily.mono).toBe('Courier');
    });

    it('defines all font sizes', () => {
      expect(typography.fontSize.xs).toBe(8);
      expect(typography.fontSize.sm).toBe(9);
      expect(typography.fontSize.base).toBe(10);
      expect(typography.fontSize.md).toBe(11);
      expect(typography.fontSize.lg).toBe(14);
      expect(typography.fontSize.xl).toBe(16);
    });

    it('defines heading sizes in descending order', () => {
      expect(typography.fontSize.h1).toBe(20);
      expect(typography.fontSize.h2).toBe(18);
      expect(typography.fontSize.h3).toBe(16);
      expect(typography.fontSize.h4).toBe(14);
      expect(typography.fontSize.h5).toBe(12);
      expect(typography.fontSize.h6).toBe(11);

      // H1 should be largest
      expect(typography.fontSize.h1).toBeGreaterThan(typography.fontSize.h2);
      expect(typography.fontSize.h2).toBeGreaterThan(typography.fontSize.h3);
    });

    it('defines line height values', () => {
      expect(typography.lineHeight.tight).toBe(1.25);
      expect(typography.lineHeight.normal).toBe(1.5);
      expect(typography.lineHeight.relaxed).toBe(1.65);

      // Should be in ascending order
      expect(typography.lineHeight.tight).toBeLessThan(
        typography.lineHeight.normal
      );
      expect(typography.lineHeight.normal).toBeLessThan(
        typography.lineHeight.relaxed
      );
    });

    it('defines font weights', () => {
      expect(typography.fontWeight.normal).toBe('normal');
      expect(typography.fontWeight.bold).toBe('bold');
    });

    it('font sizes are positive numbers', () => {
      const sizes = Object.values(typography.fontSize);
      sizes.forEach((size) => {
        expect(typeof size).toBe('number');
        expect(size).toBeGreaterThan(0);
      });
    });

    it('is immutable (as const)', () => {
      // TypeScript will enforce this at compile time
      // This test verifies the structure exists
      expect(typography).toBeDefined();
      expect(typography.fontFamily).toBeDefined();
      expect(typography.fontSize).toBeDefined();
      expect(typography.lineHeight).toBeDefined();
      expect(typography.fontWeight).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Spacing
  // ─────────────────────────────────────────────────────────────────────────

  describe('spacing', () => {
    it('defines spacing scale in ascending order', () => {
      expect(spacing.xs).toBe(2);
      expect(spacing.sm).toBe(4);
      expect(spacing.md).toBe(8);
      expect(spacing.lg).toBe(12);
      expect(spacing.xl).toBe(16);
      expect(spacing.xxl).toBe(24);
    });

    it('spacing values are in ascending order', () => {
      expect(spacing.xs).toBeLessThan(spacing.sm);
      expect(spacing.sm).toBeLessThan(spacing.md);
      expect(spacing.md).toBeLessThan(spacing.lg);
      expect(spacing.lg).toBeLessThan(spacing.xl);
      expect(spacing.xl).toBeLessThan(spacing.xxl);
    });

    it('all spacing values are positive numbers', () => {
      const values = Object.values(spacing);
      values.forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });

    it('is immutable (as const)', () => {
      expect(spacing).toBeDefined();
      expect(Object.keys(spacing)).toHaveLength(6);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Page Configuration
  // ─────────────────────────────────────────────────────────────────────────

  describe('pageConfig', () => {
    it('defines A4 page configuration', () => {
      expect(pageConfig.A4.size).toBe('A4');
      expect(pageConfig.A4.margin.top).toBe(40);
      expect(pageConfig.A4.margin.right).toBe(40);
      expect(pageConfig.A4.margin.bottom).toBe(40);
      expect(pageConfig.A4.margin.left).toBe(40);
    });

    it('defines LETTER page configuration', () => {
      expect(pageConfig.LETTER.size).toBe('LETTER');
      expect(pageConfig.LETTER.margin.top).toBe(40);
      expect(pageConfig.LETTER.margin.right).toBe(40);
      expect(pageConfig.LETTER.margin.bottom).toBe(40);
      expect(pageConfig.LETTER.margin.left).toBe(40);
    });

    it('A4 and LETTER have same margins', () => {
      expect(pageConfig.A4.margin).toEqual(pageConfig.LETTER.margin);
    });

    it('all margins are positive numbers', () => {
      const configs = [pageConfig.A4, pageConfig.LETTER];

      configs.forEach((config) => {
        expect(config.margin.top).toBeGreaterThan(0);
        expect(config.margin.right).toBeGreaterThan(0);
        expect(config.margin.bottom).toBeGreaterThan(0);
        expect(config.margin.left).toBeGreaterThan(0);
      });
    });

    it('margins are uniform (40pt on all sides)', () => {
      const { margin } = pageConfig.A4;
      expect(margin.top).toBe(margin.right);
      expect(margin.right).toBe(margin.bottom);
      expect(margin.bottom).toBe(margin.left);
    });

    it('provides both common page sizes', () => {
      expect(pageConfig).toHaveProperty('A4');
      expect(pageConfig).toHaveProperty('LETTER');
    });

    it('is immutable (as const)', () => {
      expect(pageConfig).toBeDefined();
      expect(Object.keys(pageConfig)).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Integration Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Theme Integration', () => {
    it('theme colors work with typography configuration', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      // Colors should be valid hex codes
      expect(lightColors.text).toMatch(/^#[0-9A-F]{6}$/i);
      expect(darkColors.text).toMatch(/^#[0-9A-F]{6}$/i);

      // Typography exists and can be used together
      expect(typography.fontSize.base).toBeDefined();
    });

    it('theme colors are accessible (sufficient contrast)', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      // Light theme: dark text on light bg
      expect(lightColors.text).toBe('#18181B'); // Dark
      expect(lightColors.background).toBe('#FFFFFF'); // Light

      // Dark theme: light text on dark bg
      expect(darkColors.text).toBe('#FAFAFA'); // Light
      expect(darkColors.background).toBe('#18181B'); // Dark
    });

    it('spacing works with page margins', () => {
      const { margin } = pageConfig.A4;

      // Page margin (40) should be larger than largest spacing (24)
      expect(margin.top).toBeGreaterThan(spacing.xxl);
    });

    it('complete theme object has all necessary properties', () => {
      const colors: PDFColors = getThemeColors('light');

      // Verify PDFColors interface is fully satisfied
      const requiredKeys: (keyof PDFColors)[] = [
        'background',
        'text',
        'textSecondary',
        'accent',
        'codeBg',
        'border',
        'blockquoteBorder',
        'checkboxChecked',
        'checkboxUnchecked',
      ];

      requiredKeys.forEach((key) => {
        expect(colors[key]).toBeDefined();
        expect(typeof colors[key]).toBe('string');
        expect(colors[key]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });
});
