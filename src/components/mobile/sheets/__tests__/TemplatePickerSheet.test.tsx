/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { TemplatePickerSheet } from '../TemplatePickerSheet';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock BottomSheet (must be inline due to vi.mock hoisting)
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

// Mock templates
const mockGetTemplatesForType = vi.fn();
vi.mock('@/lib/templates', () => ({
  getTemplatesForType: (...args: unknown[]) => mockGetTemplatesForType(...args),
}));

// Mock icons
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: () => 'file',
}));

// Mock contexts
const mockStore = {};
const mockTypeRegistry = {
  get: vi.fn().mockReturnValue({
    name: 'Task',
    icon: 'check-square',
  }),
};

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
  }),
  useTypeRegistry: () => mockTypeRegistry,
}));

describe('TemplatePickerSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTemplatesForType.mockReturnValue([]);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <TemplatePickerSheet
        opened={false}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Choose Template')).toBeDefined();
  });

  it('should show empty state when no templates exist', () => {
    mockGetTemplatesForType.mockReturnValue([]);

    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.getByText(/No templates for/)).toBeDefined();
    expect(
      screen.getByText('Create templates on desktop to use them here')
    ).toBeDefined();
  });

  it('should show Blank option when templates exist', () => {
    mockGetTemplatesForType.mockReturnValue([
      { id: 'tpl-1', name: 'Daily Task', description: 'For daily tasks' },
    ]);

    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.getByText('Blank Task')).toBeDefined();
    expect(screen.getByText('Start fresh without a template')).toBeDefined();
  });

  it('should display template options', () => {
    mockGetTemplatesForType.mockReturnValue([
      { id: 'tpl-1', name: 'Daily Task', description: 'For daily tasks' },
      {
        id: 'tpl-2',
        name: 'Meeting Notes',
        description: 'Template for meetings',
      },
    ]);

    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.getByText('Daily Task')).toBeDefined();
    expect(screen.getByText('For daily tasks')).toBeDefined();
    expect(screen.getByText('Meeting Notes')).toBeDefined();
    expect(screen.getByText('Template for meetings')).toBeDefined();
  });

  it('should call onSelectTemplate with null when Blank is clicked', () => {
    mockGetTemplatesForType.mockReturnValue([
      { id: 'tpl-1', name: 'Daily Task' },
    ]);

    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    fireEvent.click(screen.getByText('Blank Task'));

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSelectTemplate with template when template is clicked', () => {
    const template = {
      id: 'tpl-1',
      name: 'Daily Task',
      description: 'For daily tasks',
    };
    mockGetTemplatesForType.mockReturnValue([template]);

    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    fireEvent.click(screen.getByText('Daily Task'));

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(template);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should show Content badge for templates with content', () => {
    mockGetTemplatesForType.mockReturnValue([
      { id: 'tpl-1', name: 'Daily Task', hasContent: true },
    ]);

    renderWithProvider(
      <TemplatePickerSheet
        opened={true}
        onClose={mockOnClose}
        targetTypeId="built-in:task"
        onSelectTemplate={mockOnSelectTemplate}
      />
    );

    expect(screen.getByText('Content')).toBeDefined();
  });
});
