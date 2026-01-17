/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSearchResultRow } from '../MobileSearchResultRow';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock contexts
vi.mock('@/contexts', () => ({
  useTypeRegistry: vi.fn(() => ({
    get: vi.fn(() => ({
      name: 'Note',
      icon: 'file-text',
    })),
  })),
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>{name}</span>
  ),
}));

// Mock icons helper
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn((icon) => icon),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MobileSearchResultRow', () => {
  const mockResult = {
    item: {
      id: 'item-1',
      typeId: BuiltInTypeIds.NOTE,
      properties: {
        title: 'Search Result Title',
      },
      hasContent: false,
      inboxed: false,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    score: 0.95,
  };

  const mockHandlers = {
    onPress: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render result title', () => {
    renderWithProvider(
      <MobileSearchResultRow
        result={mockResult as any}
        query="search"
        {...mockHandlers}
      />
    );

    // Text may be split due to highlighting, so use partial matching
    expect(screen.getByText(/Result Title/)).toBeDefined();
  });

  it('should render type icon', () => {
    renderWithProvider(
      <MobileSearchResultRow
        result={mockResult as any}
        query="search"
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('icon-file-text')).toBeDefined();
  });

  it('should render type name', () => {
    renderWithProvider(
      <MobileSearchResultRow
        result={mockResult as any}
        query="search"
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Note')).toBeDefined();
  });

  it('should call onPress when row is pressed', () => {
    renderWithProvider(
      <MobileSearchResultRow
        result={mockResult as any}
        query="search"
        {...mockHandlers}
      />
    );

    // Find the button and click it
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockHandlers.onPress).toHaveBeenCalled();
  });

  it('should show Untitled when result has no title', () => {
    const untitledResult = {
      ...mockResult,
      item: {
        ...mockResult.item,
        properties: {},
      },
    };

    renderWithProvider(
      <MobileSearchResultRow
        result={untitledResult as any}
        query="search"
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Untitled')).toBeDefined();
  });

  it('should fall back to name property for title', () => {
    const namedResult = {
      ...mockResult,
      item: {
        ...mockResult.item,
        properties: { name: 'Named Result' },
      },
    };

    renderWithProvider(
      <MobileSearchResultRow
        result={namedResult as any}
        query="search"
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Named Result')).toBeDefined();
  });

  it('should render matched content when provided', () => {
    const resultWithMatches = {
      ...mockResult,
      matches: ['This is matched content from the document'],
    };

    renderWithProvider(
      <MobileSearchResultRow
        result={resultWithMatches as any}
        query="matched"
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/This is/)).toBeDefined();
  });

  it('should highlight query matches in title', () => {
    const matchingResult = {
      ...mockResult,
      item: {
        ...mockResult.item,
        properties: { title: 'Hello World Test' },
      },
    };

    renderWithProvider(
      <MobileSearchResultRow
        result={matchingResult as any}
        query="World"
        {...mockHandlers}
      />
    );

    // The title should be rendered with highlighting
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('World')).toBeDefined();
  });

  it('should handle empty query gracefully', () => {
    renderWithProvider(
      <MobileSearchResultRow
        result={mockResult as any}
        query=""
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Search Result Title')).toBeDefined();
  });

  it('should handle special regex characters in query', () => {
    const specialResult = {
      ...mockResult,
      item: {
        ...mockResult.item,
        properties: { title: 'Test [special] (chars)' },
      },
    };

    renderWithProvider(
      <MobileSearchResultRow
        result={specialResult as any}
        query="[special]"
        {...mockHandlers}
      />
    );

    // Should not throw and should render the title
    expect(screen.getByText(/Test/)).toBeDefined();
  });
});
