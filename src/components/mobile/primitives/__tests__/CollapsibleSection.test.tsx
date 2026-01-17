/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '../CollapsibleSection';
import { MantineProvider } from '@mantine/core';

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

describe('CollapsibleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks">
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Backlinks')).toBeDefined();
  });

  it('should render ReactNode title', () => {
    renderWithProvider(
      <CollapsibleSection
        title={<span data-testid="custom-title">Custom Title</span>}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByTestId('custom-title')).toBeDefined();
  });

  it('should be collapsed by default', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks">
        <div data-testid="content">Hidden content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('should be expanded when defaultOpen is true', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks" defaultOpen={true}>
        <div data-testid="content">Visible content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('should toggle expanded state on click', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks">
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('should render count badge when count is provided and > 0', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks" count={5}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('5')).toBeDefined();
  });

  it('should not render count badge when count is 0', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks" count={0}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('0')).toBeNull();
  });

  it('should call onOpenChange when toggled', () => {
    const mockOnOpenChange = vi.fn();

    renderWithProvider(
      <CollapsibleSection title="Backlinks" onOpenChange={mockOnOpenChange}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnOpenChange).toHaveBeenCalledWith(true);

    fireEvent.click(button);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should support controlled mode with open prop', () => {
    const { rerender } = renderWithProvider(
      <CollapsibleSection title="Backlinks" open={false}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    rerender(
      <MantineProvider>
        <CollapsibleSection title="Backlinks" open={true}>
          <div>Content</div>
        </CollapsibleSection>
      </MantineProvider>
    );

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('should have accessible label with item count', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks" count={3}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Backlinks, 3 items');
  });

  it('should have accessible label without count when count is 0', () => {
    renderWithProvider(
      <CollapsibleSection title="Backlinks" count={0}>
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Backlinks');
  });
});
