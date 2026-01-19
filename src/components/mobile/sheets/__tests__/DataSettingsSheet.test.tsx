/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DataSettingsSheet } from '../DataSettingsSheet';
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

describe('DataSettingsSheet', () => {
  const mockOnClose = vi.fn();
  const mockOnExport = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnExport.mockResolvedValue(undefined);
    mockOnImport.mockResolvedValue(undefined);
  });

  it('should not render when closed', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('should render when opened', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByTestId('bottom-sheet')).toBeDefined();
    expect(screen.getByText('Data Management')).toBeDefined();
  });

  it('should show export section', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    // Export Data appears both as heading and button text, use getAllByText
    const exportTexts = screen.getAllByText('Export Data');
    expect(exportTexts.length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Download your notes, tasks, and projects/)
    ).toBeDefined();
  });

  it('should show format selector', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText('Format')).toBeDefined();
  });

  it('should show export button', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByRole('button', { name: 'Export Data' })).toBeDefined();
  });

  it('should show import section', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText('Import Data')).toBeDefined();
    expect(
      screen.getByText(/Import data from a previous export/)
    ).toBeDefined();
  });

  it('should show import button', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByRole('button', { name: 'Choose File' })).toBeDefined();
  });

  it('should show supported formats info', () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText(/Supported formats:/)).toBeDefined();
  });

  it('should call onExport when export button is clicked', async () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('json');
    });
  });

  it('should call onImport when import button is clicked', async () => {
    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose File' }));

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error alert when export fails', async () => {
    mockOnExport.mockRejectedValue(new Error('Export failed'));

    renderWithProvider(
      <DataSettingsSheet
        opened={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        onImport={mockOnImport}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeDefined();
    });
  });
});
