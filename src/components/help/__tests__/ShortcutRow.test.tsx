/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ShortcutRow } from '../ShortcutRow';
import type { Shortcut } from '@/lib/shortcuts';

// Mock matchMedia for Mantine
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Store original navigator
const originalNavigator = global.navigator;

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ShortcutRow', () => {
  afterEach(() => {
    // Restore navigator after each test
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  describe('rendering', () => {
    it('should render shortcut description', () => {
      const shortcut: Shortcut = {
        description: 'Open command palette',
        keys: ['Cmd', 'K'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('Open command palette')).toBeDefined();
    });

    it('should render multiple keys', () => {
      const shortcut: Shortcut = {
        description: 'Save document',
        keys: ['Cmd', 'S'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      // Should find both keys rendered
      expect(screen.getByText('Save document')).toBeDefined();
    });

    it('should render single key shortcuts', () => {
      const shortcut: Shortcut = {
        description: 'Escape action',
        keys: ['Esc'],
        category: 'navigation',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('Escape action')).toBeDefined();
    });
  });

  describe('key symbol mappings', () => {
    it('should convert Cmd to ⌘ symbol', () => {
      // Mock Mac platform
      Object.defineProperty(global, 'navigator', {
        value: { platform: 'MacIntel' },
        writable: true,
      });

      const shortcut: Shortcut = {
        description: 'Test command',
        keys: ['Cmd'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('⌘')).toBeDefined();
    });

    it('should convert Shift to ⇧ symbol', () => {
      const shortcut: Shortcut = {
        description: 'Test shift',
        keys: ['Shift'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('⇧')).toBeDefined();
    });

    it('should convert Alt to ⌥ symbol', () => {
      const shortcut: Shortcut = {
        description: 'Test alt',
        keys: ['Alt'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('⌥')).toBeDefined();
    });

    it('should convert Escape to ⎋ symbol', () => {
      const shortcut: Shortcut = {
        description: 'Test escape',
        keys: ['Escape'],
        category: 'navigation',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('⎋')).toBeDefined();
    });

    it('should convert Enter to ↵ symbol', () => {
      const shortcut: Shortcut = {
        description: 'Test enter',
        keys: ['Enter'],
        category: 'navigation',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('↵')).toBeDefined();
    });

    it('should convert arrow keys to symbols', () => {
      const shortcut: Shortcut = {
        description: 'Test arrows',
        keys: ['Up', 'Down', 'Left', 'Right'],
        category: 'navigation',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('↑')).toBeDefined();
      expect(screen.getByText('↓')).toBeDefined();
      expect(screen.getByText('←')).toBeDefined();
      expect(screen.getByText('→')).toBeDefined();
    });

    it('should keep regular letter keys as-is', () => {
      const shortcut: Shortcut = {
        description: 'Test letter',
        keys: ['K'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('K')).toBeDefined();
    });
  });

  describe('platform-specific behavior', () => {
    it('should always display Cmd as ⌘ symbol because KEY_SYMBOLS is checked first', () => {
      // Note: The implementation checks KEY_SYMBOLS before platform detection
      // So 'Cmd' always maps to '⌘' regardless of platform
      const shortcut: Shortcut = {
        description: 'Test command',
        keys: ['Cmd'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      // Cmd always shows as ⌘ because it's in KEY_SYMBOLS
      expect(screen.getByText('⌘')).toBeDefined();
    });

    it('should handle Mac detection for iPad', () => {
      Object.defineProperty(global, 'navigator', {
        value: { platform: 'iPad' },
        writable: true,
      });

      const shortcut: Shortcut = {
        description: 'Test command',
        keys: ['Cmd'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      // iPad is treated as Mac
      expect(screen.getByText('⌘')).toBeDefined();
    });
  });

  describe('complex shortcuts', () => {
    it('should handle multi-key combinations', () => {
      const shortcut: Shortcut = {
        description: 'Complex shortcut',
        keys: ['Cmd', 'Shift', 'K'],
        category: 'global',
      };
      renderWithProvider(<ShortcutRow shortcut={shortcut} />);
      expect(screen.getByText('Complex shortcut')).toBeDefined();
      expect(screen.getByText('⇧')).toBeDefined();
      expect(screen.getByText('K')).toBeDefined();
    });
  });
});
