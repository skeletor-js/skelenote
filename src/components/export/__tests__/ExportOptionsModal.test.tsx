// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportOptionsModal } from '../ExportOptionsModal';
import { vi, describe, it, expect } from 'vitest';
import { EXPORT_FORMATS } from '@/lib/export/types';
import { MantineProvider } from '@mantine/core';

// Mock matchMedia for Mantine
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

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Icon component
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>{name}</span>
  ),
}));

// Wrap component with MantineProvider
const renderWithMantine = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ExportOptionsModal', () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onExport: vi.fn(),
  };

  it('renders correctly when open', async () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} />);

    expect(await screen.findByText('Export Options')).toBeDefined();
    expect(screen.getByText('Format')).toBeDefined();
    // Find Export button by text content (has icon as leftSection)
    expect(screen.getByText('Export').closest('button')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('does not render when closed', () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} opened={false} />);

    expect(screen.queryByText('Export Options')).toBeNull();
  });

  it('uses markdown as default format', () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} />);

    // Check if markdown description is shown (implies it's selected)
    const markdownFormat = EXPORT_FORMATS.find((f) => f.value === 'markdown');
    expect(screen.getByText(markdownFormat!.description)).toBeDefined();
  });

  it('calls onClose when cancel is clicked', () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onExport with correct options for Markdown', () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} />);

    // Default options check
    const includeTitleCheckbox = screen.getByLabelText('Title');
    const frontmatterCheckbox = screen.getByLabelText('Frontmatter');

    expect((includeTitleCheckbox as HTMLInputElement).checked).toBe(true);
    expect((frontmatterCheckbox as HTMLInputElement).checked).toBe(false); // Default state

    const exportButton = screen.getByText('Export').closest('button')!;
    fireEvent.click(exportButton);

    expect(defaultProps.onExport).toHaveBeenCalledWith({
      format: 'markdown',
      pdfTheme: 'light',
      includeTitle: true,
      includeFrontmatter: false,
    });
  });

  it('shows PDF theme options when PDF format is selected', () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} />);

    // Switch to PDF (assuming SegmentedControl behavior with text match)
    // Since PDF is usually in the segmented control if < 4 formats
    // We need to find the PDF option. Based on implementation, it might be in a Select if many formats.
    // But usually PDF is a primary format.

    // Let's emulate clicking the PDF option.
    // If it's a SegmentedControl, we look for text "PDF".
    const pdfLabel = screen.getByText('PDF');
    fireEvent.click(pdfLabel);

    expect(screen.getByText('Theme')).toBeDefined();
    expect(screen.getByText('Light')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
  });

  it('allows changing export options', () => {
    renderWithMantine(<ExportOptionsModal {...defaultProps} />);

    // Toggle Title
    const includeTitleCheckbox = screen.getByLabelText('Title');
    fireEvent.click(includeTitleCheckbox);
    expect((includeTitleCheckbox as HTMLInputElement).checked).toBe(false);

    // Toggle Frontmatter
    const frontmatterCheckbox = screen.getByLabelText('Frontmatter');
    fireEvent.click(frontmatterCheckbox);
    expect((frontmatterCheckbox as HTMLInputElement).checked).toBe(true);

    const exportButton = screen.getByText('Export').closest('button')!;
    fireEvent.click(exportButton);

    expect(defaultProps.onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        includeTitle: false,
        includeFrontmatter: true,
      })
    );
  });

  it('respects allowedFormats prop', () => {
    renderWithMantine(
      <ExportOptionsModal {...defaultProps} allowedFormats={['markdown']} />
    );

    // Should show Markdown
    expect(screen.getByText('Markdown')).toBeDefined();

    // Should NOT show PDF if strictly limited (depending on implementation - checking text might be tricky if it always renders all but disables)
    // The implementation filters `availableFormats`. So PDF text shouldn't be in the format selector.
    expect(screen.queryByText('PDF')).toBeNull();
  });
});
