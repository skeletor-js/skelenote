/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { TemplateEditorSheet } from '../TemplateEditorSheet';
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

// Mock icons lib
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn(() => 'file-text'),
}));

// Mock contexts
vi.mock('@/contexts', () => ({
  useTypeRegistry: () => ({
    get: vi.fn((typeId) => {
      const types: Record<string, { name: string; icon: string }> = {
        'built-in:task': { name: 'Task', icon: '✓' },
        'built-in:note': { name: 'Note', icon: '📝' },
        'built-in:project': { name: 'Project', icon: '📁' },
        'built-in:area': { name: 'Area', icon: '📍' },
        'built-in:meeting': { name: 'Meeting', icon: '📅' },
        'built-in:link': { name: 'Link', icon: '🔗' },
        'built-in:person': { name: 'Person', icon: '👤' },
      };
      return types[typeId] || null;
    }),
  }),
}));

// Mock types
vi.mock('@/lib/types', () => ({
  BuiltInTypeIds: {
    TASK: 'built-in:task',
    NOTE: 'built-in:note',
    PROJECT: 'built-in:project',
    AREA: 'built-in:area',
    MEETING: 'built-in:meeting',
    LINK: 'built-in:link',
    PERSON: 'built-in:person',
  },
}));

describe('TemplateEditorSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render with New Template title when creating', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('New Template')).toBeDefined();
  });

  it('should render with Edit Template title when editing', () => {
    renderWithProvider(
      <TemplateEditorSheet
        opened={true}
        onClose={mockOnClose}
        template={{
          id: 'template-1',
          name: 'My Template',
          targetTypeId: 'built-in:note',
          isDailyNoteTemplate: false,
          defaultProperties: {},
          hasContent: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />
    );

    expect(screen.getByText('Edit Template')).toBeDefined();
  });

  it('should show name input with label', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByLabelText(/Name/)).toBeDefined();
    expect(screen.getByPlaceholderText('Template name')).toBeDefined();
  });

  it('should show description textarea', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByLabelText(/Description/)).toBeDefined();
    expect(screen.getByPlaceholderText('Optional description')).toBeDefined();
  });

  it('should show creates type selector', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    // The label "Creates" appears with description text
    expect(screen.getByText('Creates')).toBeDefined();
    expect(
      screen.getByText('The type of object this template creates')
    ).toBeDefined();
  });

  it('should show Daily Note Template toggle for notes', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Daily Note Template')).toBeDefined();
    expect(
      screen.getByText('Auto-apply this template to new daily notes')
    ).toBeDefined();
  });

  it('should show Cancel and Create buttons', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDefined();
  });

  it('should show Save button when editing', () => {
    renderWithProvider(
      <TemplateEditorSheet
        opened={true}
        onClose={mockOnClose}
        template={{
          id: 'template-1',
          name: 'My Template',
          targetTypeId: 'built-in:note',
          isDailyNoteTemplate: false,
          defaultProperties: {},
          hasContent: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined();
  });

  it('should disable Create button when name is empty', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toHaveProperty('disabled', true);
  });

  it('should enable Create button when name is entered', () => {
    renderWithProvider(
      <TemplateEditorSheet
        opened={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    const input = screen.getByPlaceholderText('Template name');
    fireEvent.change(input, { target: { value: 'My Template' } });

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toHaveProperty('disabled', false);
  });

  it('should call onCreate when Create button is clicked', () => {
    renderWithProvider(
      <TemplateEditorSheet
        opened={true}
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    const input = screen.getByPlaceholderText('Template name');
    fireEvent.change(input, { target: { value: 'My Template' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockOnCreate).toHaveBeenCalledWith({
      name: 'My Template',
      description: undefined,
      targetTypeId: 'built-in:note',
      isDailyNoteTemplate: false,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Cancel is clicked', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show info text about editing template content', () => {
    renderWithProvider(
      <TemplateEditorSheet
        opened={true}
        onClose={mockOnClose}
        template={{
          id: 'template-1',
          name: 'My Template',
          targetTypeId: 'built-in:note',
          isDailyNoteTemplate: false,
          defaultProperties: {},
          hasContent: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
      />
    );

    expect(
      screen.getByText(/Edit template content by tapping on the template/)
    ).toBeDefined();
  });

  it('should show info text about adding content after creation', () => {
    renderWithProvider(
      <TemplateEditorSheet opened={true} onClose={mockOnClose} />
    );

    expect(
      screen.getByText(
        /After creating, you can add content and default properties/
      )
    ).toBeDefined();
  });
});
