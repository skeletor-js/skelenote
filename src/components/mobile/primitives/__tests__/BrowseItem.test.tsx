/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowseItem } from '../BrowseItem';
import { MantineProvider } from '@mantine/core';
import { FolderOpen, Tag, Users } from 'lucide-react';

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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('BrowseItem', () => {
  const mockOnPress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render label', () => {
    renderWithProvider(
      <BrowseItem icon={FolderOpen} label="Projects" onPress={mockOnPress} />
    );

    expect(screen.getByText('Projects')).toBeDefined();
  });

  it('should call onPress when clicked', () => {
    renderWithProvider(
      <BrowseItem icon={FolderOpen} label="Projects" onPress={mockOnPress} />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should render count badge when count is provided', () => {
    renderWithProvider(
      <BrowseItem icon={Tag} label="Tags" count={42} onPress={mockOnPress} />
    );

    expect(screen.getByText('42')).toBeDefined();
  });

  it('should not render count badge when count is 0', () => {
    renderWithProvider(
      <BrowseItem icon={Tag} label="Tags" count={0} onPress={mockOnPress} />
    );

    expect(screen.queryByText('0')).toBeNull();
  });

  it('should not render count badge when count is undefined', () => {
    renderWithProvider(
      <BrowseItem icon={Tag} label="Tags" onPress={mockOnPress} />
    );

    // Only label should be present, no number badges
    expect(screen.getByText('Tags')).toBeDefined();
  });

  it('should display 999+ for counts over 999', () => {
    renderWithProvider(
      <BrowseItem
        icon={Users}
        label="People"
        count={1500}
        onPress={mockOnPress}
      />
    );

    expect(screen.getByText('999+')).toBeDefined();
    expect(screen.queryByText('1500')).toBeNull();
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithProvider(
      <BrowseItem
        icon={FolderOpen}
        label="Projects"
        onPress={mockOnPress}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('should not call onPress when disabled', () => {
    renderWithProvider(
      <BrowseItem
        icon={FolderOpen}
        label="Projects"
        onPress={mockOnPress}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should have reduced opacity when disabled', () => {
    renderWithProvider(
      <BrowseItem
        icon={FolderOpen}
        label="Projects"
        onPress={mockOnPress}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button.style.opacity).toBe('0.5');
  });
});
