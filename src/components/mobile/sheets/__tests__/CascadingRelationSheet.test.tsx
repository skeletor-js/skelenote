/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CascadingRelationSheet } from '../CascadingRelationSheet';
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

// Mock BottomSheet
vi.mock('@/components/mobile/primitives', () => ({
  BottomSheet: ({
    children,
    opened,
    title,
  }: {
    children: React.ReactNode;
    opened: boolean;
    title: string;
  }) =>
    opened ? (
      <div data-testid="bottom-sheet">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// Mock icons lib
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn(() => 'folder'),
}));

// Mock areas and projects
const mockAreas = [
  {
    id: 'area-1',
    typeId: 'built-in:area',
    properties: { name: 'Work' },
  },
  {
    id: 'area-2',
    typeId: 'built-in:area',
    properties: { name: 'Personal' },
  },
];

const mockProjects = [
  {
    id: 'project-1',
    typeId: 'built-in:project',
    properties: { title: 'Website', area: ['area-1'] },
  },
  {
    id: 'project-2',
    typeId: 'built-in:project',
    properties: { title: 'Vacation', area: ['area-2'] },
  },
];

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: {
      get: vi.fn((id) => {
        return [...mockAreas, ...mockProjects].find((obj) => obj.id === id);
      }),
      getByType: vi.fn((typeId) => {
        if (typeId === 'built-in:area') return mockAreas;
        if (typeId === 'built-in:project') return mockProjects;
        return [];
      }),
    },
  }),
  useTypeRegistry: () => ({
    get: vi.fn((typeId) => {
      if (typeId === 'built-in:area') return { name: 'Area', icon: '📍' };
      if (typeId === 'built-in:project') return { name: 'Project', icon: '📁' };
      return null;
    }),
  }),
}));

// Mock types
vi.mock('@/lib/types', () => ({
  BuiltInTypeIds: {
    AREA: 'built-in:area',
    PROJECT: 'built-in:project',
  },
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('CascadingRelationSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnPropertyChange = vi.fn();

  const defaultObject = {
    id: 'task-1',
    typeId: 'built-in:task',
    properties: {},
    hasContent: false,
    inboxed: false,
    archived: false,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={false}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Area & Project')).toBeDefined();
  });

  it('should show Area section', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.getByText('Area')).toBeDefined();
  });

  it('should show Project section', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.getByText('Project')).toBeDefined();
  });

  it('should show None when no area/project selected', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    const noneTexts = screen.getAllByText('None');
    expect(noneTexts.length).toBe(2);
  });

  it('should show info about cascading behavior', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(
      screen.getByText(/Selecting a project will automatically set its area/)
    ).toBeDefined();
  });

  it('should show area picker when Area is clicked', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    // Get all "None" buttons and click the first one (Area)
    const noneButtons = screen.getAllByText('None');
    fireEvent.click(noneButtons[0]);

    expect(screen.getByText('Select Area')).toBeDefined();
    expect(screen.getByText('← Back')).toBeDefined();
  });

  it('should show project picker when Project is clicked', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={defaultObject}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    // Get all "None" buttons and click the second one (Project)
    const noneButtons = screen.getAllByText('None');
    fireEvent.click(noneButtons[1]);

    expect(screen.getByText('Select Project')).toBeDefined();
  });

  it('should show Locked by Project badge when project is set', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={{
          ...defaultObject,
          properties: {
            area: ['area-1'],
            project: ['project-1'],
          },
        }}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.getByText('Locked by Project')).toBeDefined();
    expect(screen.getByText('Remove project to change area')).toBeDefined();
  });

  it('should show selected area name', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={{
          ...defaultObject,
          properties: {
            area: ['area-1'],
          },
        }}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.getByText('Work')).toBeDefined();
  });

  it('should show selected project name', () => {
    renderWithProvider(
      <CascadingRelationSheet
        opened={true}
        onClose={mockOnClose}
        object={{
          ...defaultObject,
          properties: {
            project: ['project-1'],
            area: ['area-1'],
          },
        }}
        onPropertyChange={mockOnPropertyChange}
      />
    );

    expect(screen.getByText('Website')).toBeDefined();
  });
});
