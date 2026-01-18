// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBrowseView } from '../MobileBrowseView';
import { MantineProvider } from '@mantine/core';
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

// Mocks
const mockNavigateToView = vi.fn();

const mockStore = {
  getAll: vi.fn(),
};

const mockUseObjects = {
  store: mockStore,
  dataVersion: 1,
};

const mockUseArchive = { count: 5 };
const mockUseSavedViews = { count: 3 };
const mockUseTemplates = { templates: [1, 2, 3, 4] };
const mockUsePinnedObjects = { count: 7 };

vi.mock('@/contexts', () => ({
  useNavigation: () => ({ navigateToView: mockNavigateToView }),
  useObjects: () => mockUseObjects,
}));

vi.mock('@/hooks', () => ({
  useArchive: () => mockUseArchive,
  useSavedViews: () => mockUseSavedViews,
  useTemplates: () => mockUseTemplates,
  usePinnedObjects: () => mockUsePinnedObjects,
}));

// Mock child components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title }: any) => <h1>{title}</h1>,
  BrowseItem: ({ label, count, onPress }: any) => (
    <button onClick={onPress}>
      {label} {count !== undefined ? `(${count})` : ''}
    </button>
  ),
}));

describe('MobileBrowseView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default store return
    mockStore.getAll.mockReturnValue([
      { typeId: BuiltInTypeIds.PROJECT, properties: { status: 'active' } },
      { typeId: BuiltInTypeIds.PROJECT, properties: { status: 'active' } }, // 2 Projects
      { typeId: BuiltInTypeIds.AREA, properties: {} }, // 1 Area
      { typeId: BuiltInTypeIds.TAG, properties: {} },
      { typeId: BuiltInTypeIds.TAG, properties: {} },
      { typeId: BuiltInTypeIds.TAG, properties: {} }, // 3 Tags
      { typeId: BuiltInTypeIds.NOTE, properties: {} }, // Ignored
    ]);
    mockUseObjects.dataVersion = 1;
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <MobileBrowseView />
      </MantineProvider>
    );
  };

  it('renders all sections and items', () => {
    renderView();
    expect(screen.getByText('Library')).toBeTruthy();

    expect(screen.getByText('Organization')).toBeTruthy(); // Section Header
    expect(screen.getByText('History & Archive')).toBeTruthy();
    expect(screen.getByText('Advanced')).toBeTruthy();

    expect(screen.getAllByText(/Pinned/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Projects/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Areas/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tags/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Saved Views/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Archive/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Time Machine/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Templates/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Browse Types/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Settings/).length).toBeGreaterThan(0);
  });

  it('displays correct counts', () => {
    renderView();

    // Pinned: 7 (Search strict string to avoid regex confusion if possible, or use length)
    // using getAllByText ensures even if multiple matches exist we are good.
    expect(screen.getAllByText('Pinned (7)').length).toBeGreaterThan(0);

    // Projects: 2
    expect(screen.getAllByText('Projects (2)').length).toBeGreaterThan(0);

    // Areas: 1
    expect(screen.getAllByText('Areas (1)').length).toBeGreaterThan(0);

    // Tags: 3
    expect(screen.getAllByText('Tags (3)').length).toBeGreaterThan(0);

    // Saved Views: 3
    expect(screen.getAllByText('Saved Views (3)').length).toBeGreaterThan(0);

    // Archive: 5
    expect(screen.getAllByText('Archive (5)').length).toBeGreaterThan(0);

    // Templates: 4
    expect(screen.getAllByText('Templates (4)').length).toBeGreaterThan(0);
  });

  it('navigates correctly on press', () => {
    renderView();

    // For buttons, use more specific selectors if needed, or getAllByText()[0] if buttons are what we click.
    // Mock renders <button> for items.
    // screen.getAllByText returns the TEXT nodes.
    // Parent button click should work if event bubbles?
    // Or get button by text.
    // fireEvent.click on text node bubbles to button.

    const projectsTexts = screen.getAllByText(/Projects/);
    fireEvent.click(projectsTexts[0]); // Click the first one found (likely the button content)
    expect(mockNavigateToView).toHaveBeenCalledWith('projects');

    const tmTexts = screen.getAllByText(/Time Machine/);
    fireEvent.click(tmTexts[0]);
    expect(mockNavigateToView).toHaveBeenCalledWith('time-machine');

    const settingsTexts = screen.getAllByText(/Settings/);
    fireEvent.click(settingsTexts[0]);
    expect(mockNavigateToView).toHaveBeenCalledWith('settings');
  });

  it('handles null store gracefully', () => {
    // @ts-ignore
    const originalStore = mockUseObjects.store;
    // @ts-ignore
    mockUseObjects.store = null;

    renderView();

    // Counts should be 0 safely
    expect(screen.getAllByText('Projects (0)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Areas (0)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tags (0)').length).toBeGreaterThan(0);

    // Restore
    mockUseObjects.store = originalStore;
  });
});
