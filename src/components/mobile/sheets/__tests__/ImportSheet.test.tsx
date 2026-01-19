/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportSheet } from '../ImportSheet';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useObjects, useToast } from '@/contexts';
import { useHaptics } from '@/hooks';
import * as importLib from '@/lib/import';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock dependencies
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
}));

vi.mock('@/contexts', () => ({
  useObjects: vi.fn(),
  useToast: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useHaptics: vi.fn(),
}));

vi.mock('@/lib/import', () => ({
  importMarkdown: vi.fn(),
  readVaultDirectory: vi.fn(),
  parseVaultFiles: vi.fn(),
  importObsidianVault: vi.fn(),
  inferTypeFromVaultFile: vi.fn(),
}));

// Mock BottomSheet (must be inline due to vi.mock hoisting)
vi.mock('../primitives', () => ({
  BottomSheet: ({ opened, children }: any) =>
    opened ? <div data-testid="bottom-sheet">{children}</div> : null,
}));

vi.mock('lucide-react', async () => {
  const actual =
    await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
  };
});

describe('ImportSheet', () => {
  const mocks = {
    store: {
      create: vi.fn(),
      setContent: vi.fn(),
    },
    refreshData: vi.fn(),
    addToast: vi.fn(),
    notification: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useObjects as any).mockReturnValue({
      store: mocks.store,
      refreshData: mocks.refreshData,
    });

    (useToast as any).mockReturnValue({
      addToast: mocks.addToast,
    });

    (useHaptics as any).mockReturnValue({
      notification: mocks.notification,
    });

    mocks.store.create.mockReturnValue({ id: 'new-id' });
  });

  it('renders selection options', () => {
    renderWithProvider(<ImportSheet opened={true} onClose={mocks.onClose} />);
    expect(screen.getByText('Markdown Files')).toBeDefined();
    expect(screen.getByText('Obsidian Vault')).toBeDefined();
    expect(screen.getByText('JSON Backup')).toBeDefined();
  });

  it('handles markdown import success', async () => {
    (open as any).mockResolvedValue(['/path/to/file.md']);
    (readTextFile as any).mockResolvedValue('# Title\nContent');
    (importLib.importMarkdown as any).mockReturnValue({
      typeId: 'built-in:note',
      title: 'Title',
      properties: {},
      blocks: [{ type: 'paragraph' }],
    });

    renderWithProvider(<ImportSheet opened={true} onClose={mocks.onClose} />);
    fireEvent.click(screen.getByText('Markdown Files'));

    await waitFor(() => {
      expect(mocks.store.create).toHaveBeenCalled();
      expect(mocks.store.setContent).toHaveBeenCalled();
      expect(screen.getByText('Import Complete')).toBeDefined();
    });
  });

  it('handles markdown import cancellation', async () => {
    (open as any).mockResolvedValue(null);
    renderWithProvider(<ImportSheet opened={true} onClose={mocks.onClose} />);
    fireEvent.click(screen.getByText('Markdown Files'));

    // After cancellation, component transitions back to 'select' step
    await waitFor(() => {
      expect(screen.getByText('Markdown Files')).toBeDefined();
    });
    expect(screen.queryByText('Importing...')).toBeNull();
  });

  it('handles obsidian vault import success', async () => {
    (open as any).mockResolvedValue('/path/to/vault');
    (importLib.readVaultDirectory as any).mockResolvedValue(['file1.md']);
    (importLib.parseVaultFiles as any).mockReturnValue([
      { path: 'file1.md', parsed: {} },
    ]);
    (importLib.inferTypeFromVaultFile as any).mockReturnValue({
      typeId: 'built-in:note',
    });
    (importLib.importObsidianVault as any).mockImplementation(
      async ({ onProgress }: any) => {
        onProgress({ current: 1, total: 1, phase: 'complete' });
        return { imported: 1, skipped: 0, errors: [] };
      }
    );

    renderWithProvider(<ImportSheet opened={true} onClose={mocks.onClose} />);
    fireEvent.click(screen.getByText('Obsidian Vault'));

    await waitFor(() => {
      expect(importLib.readVaultDirectory).toHaveBeenCalledWith(
        '/path/to/vault'
      );
      expect(importLib.importObsidianVault).toHaveBeenCalled();
      expect(screen.getByText('Import Complete')).toBeDefined();
    });
  });

  it('handles JSON backup import success', async () => {
    (open as any).mockResolvedValue('/path/to/backup.json');
    const backupData = {
      objects: [
        { typeId: 'note', properties: { title: 'Note 1' }, content: '[]' },
      ],
    };
    (readTextFile as any).mockResolvedValue(JSON.stringify(backupData));

    renderWithProvider(<ImportSheet opened={true} onClose={mocks.onClose} />);
    fireEvent.click(screen.getByText('JSON Backup'));

    await waitFor(() => {
      expect(mocks.store.create).toHaveBeenCalled();
      expect(screen.getByText('Import Complete')).toBeDefined();
    });
  });

  it('handles JSON backup invalid format', async () => {
    (open as any).mockResolvedValue('/path/to/bad.json');
    (readTextFile as any).mockResolvedValue(
      JSON.stringify({ invalid: 'data' })
    );

    renderWithProvider(<ImportSheet opened={true} onClose={mocks.onClose} />);
    fireEvent.click(screen.getByText('JSON Backup'));

    await waitFor(() => {
      expect(screen.getByText('Import Failed')).toBeDefined();
      expect(screen.getByText(/Invalid backup format/)).toBeDefined();
    });
  });
});
