/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplateSettingsSheet } from '../TemplateSettingsSheet';
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

// Mock BottomSheet and ConfirmDialog
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
  ConfirmDialog: () => null,
}));

// Mock TemplateEditorSheet
vi.mock('../TemplateEditorSheet', () => ({
  TemplateEditorSheet: () => null,
}));

// Mock templates
const mockTemplates = [
  {
    id: 'template-1',
    name: 'Meeting Notes',
    targetTypeId: 'built-in:note',
    description: 'Template for meeting notes',
    isDailyNoteTemplate: false,
  },
  {
    id: 'template-2',
    name: 'Daily Journal',
    targetTypeId: 'built-in:note',
    description: 'Daily journaling template',
    isDailyNoteTemplate: true,
  },
];

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockSetDailyNoteTemplate = vi.fn();

vi.mock('@/hooks', () => ({
  useTemplates: () => ({
    templates: mockTemplates,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    setDailyNoteTemplate: mockSetDailyNoteTemplate,
    dailyNoteTemplate: mockTemplates[1],
  }),
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}));

// Mock contexts
vi.mock('@/contexts', () => ({
  useTypeRegistry: () => ({
    get: vi.fn((typeId) => {
      if (typeId === 'built-in:note') {
        return { name: 'Note', icon: '📝' };
      }
      return null;
    }),
  }),
  useNavigation: () => ({
    navigateToObject: vi.fn(),
  }),
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// Mock icons lib
vi.mock('@/lib/icons', () => ({
  getIconFromEmoji: vi.fn(() => 'file-text'),
}));

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('TemplateSettingsSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={false} onClose={mockOnClose} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Templates')).toBeDefined();
  });

  it('should show daily note template section', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Daily Note Template')).toBeDefined();
    expect(
      screen.getByText('Auto-apply this template to new daily notes')
    ).toBeDefined();
  });

  it('should show all templates section', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('All Templates')).toBeDefined();
  });

  it('should show create button', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByRole('button', { name: /Create/i })).toBeDefined();
  });

  it('should show template names', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    // Template names appear in both the Select dropdown and the template list
    const meetingNotesTexts = screen.getAllByText('Meeting Notes');
    const dailyJournalTexts = screen.getAllByText('Daily Journal');
    expect(meetingNotesTexts.length).toBeGreaterThanOrEqual(1);
    expect(dailyJournalTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('should show Daily badge for daily note template', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Daily')).toBeDefined();
  });

  it('should show edit and delete buttons for each template', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });

    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('should show creates type info', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    const createsTexts = screen.getAllByText(/Creates:/);
    expect(createsTexts.length).toBe(2);
  });

  it('should show template descriptions', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Template for meeting notes')).toBeDefined();
    expect(screen.getByText('Daily journaling template')).toBeDefined();
  });

  it('should have combobox for daily note template selection', () => {
    renderWithProvider(
      <TemplateSettingsSheet opened={true} onClose={mockOnClose} />
    );

    // Mantine Select uses combobox role
    const combobox = screen.getByRole('textbox');
    expect(combobox).toBeDefined();
  });
});
