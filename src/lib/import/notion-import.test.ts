import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importFromNotion, type NotionImportOptions } from './notion-import';
import { BuiltInTypeIds } from '../types';

// Mocks
const mockQueryDatabase = vi.fn();
const mockGetPageBlocks = vi.fn();

vi.mock('./notion-api', () => ({
  queryDatabase: (...args: any[]) => mockQueryDatabase(...args),

  getPageBlocks: (...args: any[]) => mockGetPageBlocks(...args),
  listStandalonePages: vi.fn().mockResolvedValue([]),
}));

vi.mock('./notion-blocks', () => ({
  convertNotionBlocks: vi
    .fn()
    .mockReturnValue([{ type: 'paragraph', content: 'test' }]),
}));

vi.mock('./notion-properties', () => ({
  convertNotionProperties: vi.fn().mockReturnValue({
    properties: { title: 'Test Page' },
    pendingTags: ['tag1'],
  }),
}));

describe('Notion Import', () => {
  let mockStore: any;

  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStore = {
      create: vi.fn().mockReturnValue({ id: 'new-obj-id' }),
      getByType: vi.fn().mockReturnValue([]), // No existing tags
      setContent: vi.fn(),
    };

    mockClient = { token: 'fake-token' };

    mockQueryDatabase.mockResolvedValue([
      {
        id: 'page-1',
        properties: {},
        title: 'Page 1',
        url: 'http://notion.so/page-1',
      },
    ]);

    mockGetPageBlocks.mockResolvedValue([]);
  });

  it('should run import flow successfully', async () => {
    const options: NotionImportOptions = {
      client: mockClient,
      store: mockStore,
      databases: [
        {
          database: { id: 'db-1', name: 'DB 1' } as any,
          targetTypeId: BuiltInTypeIds.NOTE,
          selected: true,
        },
      ],
      importStandalonePages: false,
      onProgress: vi.fn(),
    };

    const result = await importFromNotion(options);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);

    // Verify steps
    expect(mockQueryDatabase).toHaveBeenCalled();
    // Should check for existing tags
    expect(mockStore.getByType).toHaveBeenCalledWith(BuiltInTypeIds.TAG);
    // Should create tag 'tag1'
    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.TAG,
        properties: { name: 'tag1' },
      })
    );
    // Should create page
    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.NOTE,
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    mockQueryDatabase.mockRejectedValue(new Error('API Error'));

    const result = await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [
        {
          database: { id: 'db-1', name: 'DB 1' } as any,
          targetTypeId: 'note',
          selected: true,
        },
      ],
      importStandalonePages: false,
    });

    // Should not fail entire process, just log error
    expect(result.success).toBe(true);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Failed to fetch DB 1');
  });
});
