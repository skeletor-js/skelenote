// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobilePinnedView } from '../MobilePinnedView';
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    div: ({
      children,
      layout,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mocks
const mockNavigateToObject = vi.fn();
const mockUnpin = vi.fn();
const mockHaptics = { notification: vi.fn() };
const mockTypeRegistry = {
  get: vi.fn().mockReturnValue({ icon: 'file' }),
};
const mockObjectsStore = {
  get: vi.fn(),
};

vi.mock('@/contexts', () => ({
  useNavigation: () => ({ navigateToObject: mockNavigateToObject }),
  useObjects: () => ({ store: mockObjectsStore }),
  useTypeRegistry: () => mockTypeRegistry,
}));

const mockUsePinnedObjects = {
  pinnedObjects: [] as unknown[],
  count: 0,
  unpin: mockUnpin,
};

vi.mock('@/hooks', () => ({
  usePinnedObjects: () => mockUsePinnedObjects,
  useHaptics: () => mockHaptics,
  useReducedMotion: () => false,
}));

// Mock child components
vi.mock('../../primitives', () => ({
  MobileViewHeader: ({ title, count }: any) => (
    <h1>
      {title} <span data-testid="count">{count}</span>
    </h1>
  ),
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  // Mock SwipeableRow exposing left actions
  SwipeableRow: ({ children, leftActions, onPress }: any) => (
    <div data-testid="swipeable-row" onClick={onPress}>
      {children}
      <div className="left-actions">
        {leftActions &&
          leftActions.map((a: any) => (
            <button
              key={a.id}
              onClick={(e) => {
                e.stopPropagation();
                a.onAction();
              }}
            >
              {a.label}
            </button>
          ))}
      </div>
    </div>
  ),
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span>Icon:{name}</span>,
  type: {},
}));

vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: () => 'emoji-icon',
  type: {},
}));

vi.mock('@/lib/utils/date', () => ({
  formatRelativeDate: () => 'Tomorrow',
  isOverdue: () => false,
}));

const mockItem1 = {
  id: 'item1',
  typeId: 'built-in:note',
  properties: { title: 'Pinned Note' },
};

describe('MobilePinnedView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePinnedObjects.pinnedObjects = [mockItem1];
    mockUsePinnedObjects.count = 1;
  });

  const renderView = () => {
    return render(
      <MantineProvider>
        <MobilePinnedView />
      </MantineProvider>
    );
  };

  it('renders list of pinned items', () => {
    renderView();
    expect(screen.getByText('Pinned Note')).toBeTruthy();
    expect(screen.getByTestId('count').textContent).toContain('1');
  });

  it('renders empty state', () => {
    mockUsePinnedObjects.pinnedObjects = [];
    mockUsePinnedObjects.count = 0;
    renderView();
    expect(screen.getByTestId('empty-state').textContent).toContain(
      'No pinned items'
    );
  });

  it('navigates on tap', () => {
    renderView();
    fireEvent.click(screen.getByTestId('swipeable-row'));
    expect(mockNavigateToObject).toHaveBeenCalledWith('item1');
  });

  it('unpins item via swipe action', () => {
    renderView();
    const unpinBtn = screen.getByText('Unpin');
    fireEvent.click(unpinBtn);

    expect(mockHaptics.notification).toHaveBeenCalledWith('success');
    expect(mockUnpin).toHaveBeenCalledWith('item1');
  });
});
