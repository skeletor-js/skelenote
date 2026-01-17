/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readVaultDirectory, importObsidianVault } from '../obsidian';
import { BuiltInTypeIds } from '../../types';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// Mock store
const mockStore = {
  getAll: vi.fn().mockReturnValue([]),
  create: vi.fn(),
  setContent: vi.fn(),
  getByType: vi.fn().mockReturnValue([]),
};

describe('Obsidian Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readVaultDirectory', () => {
    it('should invoke tauri command', async () => {
      mockInvoke.mockResolvedValue([{ path: 'note.md', content: 'content' }]);

      const files = await readVaultDirectory('/path/to/vault');

      expect(mockInvoke).toHaveBeenCalledWith('read_vault_directory', {
        directory: '/path/to/vault',
      });
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('note.md');
    });
  });

  describe('importObsidianVault', () => {
    it('should import selected files', async () => {
      mockStore.create.mockReturnValue({ id: 'obj-1' });
      mockStore.getAll.mockReturnValue([]);

      const files: any[] = [
        {
          path: 'note.md',
          name: 'note',
          selected: true,
          hashtags: ['tag1'],
          parsed: {
            title: 'My Note',
            properties: {},
            blocks: [{ type: 'paragraph', content: [] }],
            wikiLinks: [],
            typeId: BuiltInTypeIds.NOTE,
          },
        },
      ];

      const result = await importObsidianVault({
        store: mockStore as any,
        vaultPath: '/vault',
        files,
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(mockStore.create).toHaveBeenCalledTimes(2); // 1 tag + 1 note

      // Check Tag creation
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: BuiltInTypeIds.TAG,
          properties: { title: 'tag1' },
        })
      );

      // Check Note creation
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: BuiltInTypeIds.NOTE,
          properties: expect.objectContaining({ title: 'My Note' }),
        })
      );
    });

    it('should resolve wiki-links', async () => {
      mockStore.create
        .mockReturnValueOnce({ id: 'obj-1' }) // Note 1
        .mockReturnValueOnce({ id: 'obj-2' }); // Note 2

      mockStore.getAll.mockReturnValue([]);

      const files: any[] = [
        {
          path: 'note1.md',
          name: 'note1',
          selected: true,
          hashtags: [],
          parsed: {
            title: 'Note 1',
            properties: {},
            blocks: [],
            wikiLinks: [],
            typeId: BuiltInTypeIds.NOTE,
          },
        },
        {
          path: 'note2.md',
          name: 'note2',
          selected: true,
          hashtags: [],
          parsed: {
            title: 'Note 2',
            properties: {},
            blocks: [{ type: 'paragraph', content: '[[note1]]' }], // Simplified block structure for test
            wikiLinks: [{ target: 'note1' }],
            typeId: BuiltInTypeIds.NOTE,
          },
        },
      ];

      const result = await importObsidianVault({
        store: mockStore as any,
        vaultPath: '/vault',
        files,
      });

      expect(result.imported).toBe(2);
      // Linking phase should update content of note2
      expect(mockStore.setContent).toHaveBeenCalled();
    });
  });
});
