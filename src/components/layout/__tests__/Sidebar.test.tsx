/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { MantineProvider } from '@mantine/core';
import React from 'react';
import * as contexts from '@/contexts';
import * as hooks from '@/hooks';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock matchMedia for Mantine
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

// Mock dependencies
vi.mock('@/contexts', () => ({
  useSidebar: vi.fn(),
  useNavigation: vi.fn(),
  useObjects: vi.fn(),
  useTypeRegistry: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useLinkToDaily: vi.fn(),
}));

// Mock child components to test Sidebar in isolation
vi.mock('../PinnedSection', () => ({
  PinnedSection: () => <div data-testid="pinned-section" />,
}));
vi.mock('../ObjectsSection', () => ({
  ObjectsSection: () => <div data-testid="objects-section" />,
}));
vi.mock('../SavedViewsSection', () => ({
  SavedViewsSection: () => <div data-testid="saved-views-section" />,
}));
vi.mock('../SidebarSection', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SidebarSection: ({ title, children }: any) => (
    <div data-testid={`section-${title}`}>
      {title}
      {children}
    </div>
  ),
}));

// We don't mock SidebarItem essentially, but since it uses Contexts inside or complex styling,
// we might want to let the real one render OR mock it if it causes issues.
// Real SidebarItem is likely fine as it is simple.
// But Sidebar uses it directly.

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('Sidebar', () => {
  const mockNavigateToView = vi.fn();
  const mockNavigateToObject = vi.fn();
  const mockNavigateToSavedView = vi.fn();
  const mockSetSelectedItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useSidebar as any).mockReturnValue({
      selectedItem: 'inbox',
      setSelectedItem: mockSetSelectedItem,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useNavigation as any).mockReturnValue({
      navigateToView: mockNavigateToView,
      navigateToObject: mockNavigateToObject,
      navigateToSavedView: mockNavigateToSavedView,
      activeSavedViewId: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useObjects as any).mockReturnValue({
      store: {
        getByType: vi.fn(() => []), // Return empty arrays for Project/Area/Tag tests
        create: vi.fn(),
      },
      refreshData: vi.fn(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (contexts.useTypeRegistry as any).mockReturnValue({
      getAll: vi.fn(() => []),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (hooks.useLinkToDaily as any).mockReturnValue({
      linkToDaily: vi.fn(),
    });
  });

  it('should render standard navigation items', () => {
    renderWithProvider(<Sidebar inboxCount={5} />);

    expect(screen.getByText('Inbox')).toBeDefined();
    expect(screen.getByText('Daily Notes')).toBeDefined();
    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByText('Archive')).toBeDefined();

    // Check inbox count badge
    expect(screen.getByText('5')).toBeDefined();
  });

  it('should navigate when items are clicked', () => {
    renderWithProvider(<Sidebar />);

    fireEvent.click(screen.getByText('Inbox'));
    expect(mockNavigateToView).toHaveBeenCalledWith('inbox');

    fireEvent.click(screen.getByText('Daily Notes'));
    expect(mockNavigateToView).toHaveBeenCalledWith('daily-notes');
  });

  it('should render sections', () => {
    renderWithProvider(<Sidebar />);

    expect(screen.getByTestId('pinned-section')).toBeDefined();
    expect(screen.getByTestId('objects-section')).toBeDefined();
    expect(screen.getByTestId('saved-views-section')).toBeDefined();

    // Areas, Projects, Tags are rendered via SidebarSection which we mocked
    expect(screen.getByTestId('section-Areas')).toBeDefined();
    expect(screen.getByTestId('section-Projects')).toBeDefined();
    expect(screen.getByTestId('section-Tags')).toBeDefined();
  });
});
