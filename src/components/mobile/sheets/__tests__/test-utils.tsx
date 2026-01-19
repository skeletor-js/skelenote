/**
 * Shared test utilities for mobile sheet component tests.
 *
 * Usage:
 *   import { renderWithProvider, setupSheetMocks, createMockStore } from './test-utils';
 *
 *   // At the top of your test file (after imports, before describe):
 *   setupSheetMocks();
 *
 *   // Mock BottomSheet (must be inline due to vi.mock hoisting):
 *   vi.mock('@/components/mobile/primitives', () => ({
 *     BottomSheet: ({ children, opened, title }: { children: React.ReactNode; opened: boolean; title: string }) =>
 *       opened ? <div data-testid="bottom-sheet"><h2>{title}</h2>{children}</div> : null,
 *   }));
 *
 *   // In your tests:
 *   renderWithProvider(<YourSheet {...props} />);
 */
import { render, RenderResult } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';

/**
 * Sets up common mocks required for sheet component tests.
 * Call this at the top of your test file, after imports.
 */
export function setupSheetMocks(): void {
  // Mock ResizeObserver (required by Mantine)
  global.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };

  // Mock matchMedia (required by Mantine)
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
}

/**
 * Renders a component wrapped in MantineProvider.
 * Required for testing components that use Mantine.
 */
export function renderWithProvider(ui: React.ReactNode): RenderResult {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

/**
 * Creates a mock ObjectStore for testing components that use useObjects.
 * Returns the mock store object that can be configured in beforeEach.
 */
export function createMockStore() {
  return {
    getByType: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
