/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewHeader } from '../ViewHeader';
import { MantineProvider } from '@mantine/core';
import React from 'react';

// Mock matchMedia
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

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ViewHeader', () => {
  it('renders title', () => {
    renderWithProvider(<ViewHeader title="My View" />);
    expect(screen.getByText('My View')).toBeDefined();
  });

  it('renders count badge', () => {
    renderWithProvider(<ViewHeader title="My View" count={42} />);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders subtitle', () => {
    renderWithProvider(<ViewHeader title="My View" subtitle="Sub info" />);
    expect(screen.getByText('Sub info')).toBeDefined();
  });

  it('renders back button and handles click', () => {
    const onBack = vi.fn();
    renderWithProvider(
      <ViewHeader title="My View" backButton={{ onClick: onBack }} />
    );

    const btn = screen.getByText('Back');
    fireEvent.click(btn);
    expect(onBack).toHaveBeenCalled();
  });

  it('renders custom sections', () => {
    renderWithProvider(
      <ViewHeader
        title="My View"
        leftSection={<span data-testid="left">Left</span>}
        rightSection={<span data-testid="right">Right</span>}
      />
    );

    expect(screen.getByTestId('left')).toBeDefined();
    expect(screen.getByTestId('right')).toBeDefined();
  });
});
