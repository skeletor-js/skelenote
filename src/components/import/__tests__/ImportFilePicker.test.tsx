// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportFilePicker } from '../ImportFilePicker';
import { vi, describe, it, expect, beforeEach } from 'vitest';
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

// Mock Tauri dialog
const mockOpen = vi.fn();
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: any[]) => mockOpen(...args),
}));

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>{name}</span>
  ),
}));

// Mock classes
vi.mock('./ImportWizard.module.css', () => ({
  default: { instructionsAlert: 'instructionsAlert' },
}));

const renderWithMantine = (ui: React.ReactNode) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('ImportFilePicker', () => {
  const defaultProps = {
    source: 'markdown' as const,
    onFilesSelected: vi.fn(),
    onFolderSelected: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders instruction title for Markdown', () => {
    renderWithMantine(<ImportFilePicker {...defaultProps} />);
    expect(screen.getByText(/Select Markdown Files/i)).toBeDefined();
    expect(screen.getByText('Select .md,.markdown files')).toBeDefined();
  });

  it('renders folder selection for Obsidian', () => {
    renderWithMantine(<ImportFilePicker {...defaultProps} source="obsidian" />);
    expect(screen.getByText(/Select your vault/i)).toBeDefined();
    expect(screen.getByText('Browse')).toBeDefined();
    expect(screen.getByPlaceholderText('No folder selected')).toBeDefined();
  });

  it('disables continue button initially', () => {
    renderWithMantine(<ImportFilePicker {...defaultProps} />);
    expect(
      (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('enables continue button when files selected (simulated)', () => {
    // Note: FileInput is hard to drive with pure JS events because of security.
    // However, @mantine/core FileInput relies on an internal input type="file".
    // We can try firing change event on the hidden input if we can find it.

    // Easier approach: The component allows passing `value` if controlled, but here it's uncontrolled inside.
    // We will simulate the `onChange` of the FileInput via testing-library if possible.
    // If difficult, we might need a workaround or less strict test.

    const { container } = renderWithMantine(
      <ImportFilePicker {...defaultProps} />
    );

    // Find the hidden input
    // Mantine FileInput hides the real input.
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeDefined();

    if (input) {
      const file = new File(['content'], 'test.md', { type: 'text/markdown' });
      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText('1 file selected')).toBeDefined();
      expect(
        (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement)
          .disabled
      ).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(defaultProps.onFilesSelected).toHaveBeenCalledWith([file]);
    }
  });

  it('handles folder selection for Obsidian', async () => {
    mockOpen.mockResolvedValue('/path/to/vault');

    renderWithMantine(<ImportFilePicker {...defaultProps} source="obsidian" />);

    const browseBtn = screen.getByText('Browse');
    fireEvent.click(browseBtn);

    expect(mockOpen).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: 'Select Obsidian Vault',
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('/path/to/vault')).toBeDefined();
    });

    expect(
      (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(defaultProps.onFolderSelected).toHaveBeenCalledWith(
      '/path/to/vault'
    );
  });

  it('handles folder selection cancellation', async () => {
    mockOpen.mockResolvedValue(null);

    renderWithMantine(<ImportFilePicker {...defaultProps} source="obsidian" />);

    const browseBtn = screen.getByText('Browse');
    fireEvent.click(browseBtn);

    // Wait a tick
    await waitFor(() => {});

    const input = screen.getByPlaceholderText(
      'No folder selected'
    ) as HTMLInputElement;
    expect(input.value).toBe('');
    expect(
      (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('calls onBack when back button is clicked', () => {
    renderWithMantine(<ImportFilePicker {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
