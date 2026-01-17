import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importFromNotion, previewNotionImport } from '../notion-import';
import { BuiltInTypeIds } from '../../types';
import * as notionApi from '../notion-api';
import * as notionProps from '../notion-properties';
import * as notionBlocks from '../notion-blocks';

// Mock dependencies
vi.mock('../notion-api');
vi.mock('../notion-properties');
vi.mock('../notion-blocks');

describe('Notion Import', () => {
  const mockClient = {} as any;
  const mockStore = {
    create: vi.fn(),
    getByType: vi.fn(),
    setContent: vi.fn(),
  } as any;

  const mockDb = {
    id: 'db-1',
    name: 'Tasks',
    icon: null,
    properties: [] as { id: string; name: string; type: string }[],
  };

  const mockPageFn = (id: string, title: string) => ({
    id,
    title,
    databaseId: 'db-1',
    properties: {},
    icon: null,
    createdTime: '2023-01-01',
    lastEditedTime: '2023-01-01',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store mocks
    mockStore.create.mockImplementation((input: any) => ({
      id: 'obj-1',
      ...input,
    }));
    mockStore.getByType.mockReturnValue([]);
    mockStore.setContent.mockReturnValue(undefined);

    // Default API mocks
    vi.mocked(notionApi.queryDatabase).mockResolvedValue([
      mockPageFn('p1', 'Page 1'),
    ]);
    vi.mocked(notionApi.getPageBlocks).mockResolvedValue([]);
    vi.mocked(notionApi.listStandalonePages).mockResolvedValue([]);

    vi.mocked(notionProps.convertNotionProperties).mockReturnValue({
      properties: { title: 'Converted Title' },
      pendingTags: [],
      pendingPeople: [],
      pendingRelations: new Map(),
    });

    vi.mocked(notionBlocks.convertNotionBlocks).mockReturnValue([]);
  });

  describe('importFromNotion', () => {
    it('imports pages from selected databases', async () => {
      const result = await importFromNotion({
        client: mockClient,
        store: mockStore,
        databases: [
          {
            database: mockDb,
            targetTypeId: BuiltInTypeIds.TASK,
            selected: true,
          },
        ],
        importStandalonePages: false,
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(notionApi.queryDatabase).toHaveBeenCalledWith(
        mockClient,
        'db-1',
        expect.any(Function)
      );
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: BuiltInTypeIds.TASK,
          properties: expect.objectContaining({ title: 'Converted Title' }),
        })
      );
    });

    it('skips unselected databases', async () => {
      await importFromNotion({
        client: mockClient,
        store: mockStore,
        databases: [
          {
            database: mockDb,
            targetTypeId: BuiltInTypeIds.TASK,
            selected: false,
          },
        ],
        importStandalonePages: false,
      });

      expect(notionApi.queryDatabase).not.toHaveBeenCalled();
    });

    it('creates tags before importing pages', async () => {
      vi.mocked(notionApi.queryDatabase).mockResolvedValue([
        mockPageFn('p1', 'Page 1'),
      ]);
      vi.mocked(notionProps.convertNotionProperties).mockReturnValue({
        properties: { title: 'Page 1' },
        pendingTags: ['urgent'],
        pendingPeople: [],
        pendingRelations: new Map(),
      });

      // Mock existing tags check
      mockStore.getByType.mockReturnValue([]);
      mockStore.create.mockReturnValue({ id: 'tag-1' });

      const result = await importFromNotion({
        client: mockClient,
        store: mockStore,
        databases: [
          {
            database: mockDb,
            targetTypeId: BuiltInTypeIds.TASK,
            selected: true,
          },
        ],
        importStandalonePages: false,
      });

      expect(result.createdTags.get('urgent')).toBe('tag-1');
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: BuiltInTypeIds.TAG,
          properties: { name: 'urgent' },
        })
      );
    });

    it('imports standalone pages if requested', async () => {
      vi.mocked(notionApi.listStandalonePages).mockResolvedValue([
        mockPageFn('standalone-1', 'Standalone'),
      ]);

      await importFromNotion({
        client: mockClient,
        store: mockStore,
        databases: [],
        importStandalonePages: true,
      });

      expect(notionApi.listStandalonePages).toHaveBeenCalled();
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: BuiltInTypeIds.NOTE, // Standalone defaults to NOTE
        })
      );
    });

    it('handles database fetch errors', async () => {
      vi.mocked(notionApi.queryDatabase).mockRejectedValue(
        new Error('API Error')
      );

      const result = await importFromNotion({
        client: mockClient,
        store: mockStore,
        databases: [
          {
            database: { ...mockDb, icon: null },
            targetTypeId: 'task',
            selected: true,
          },
        ],
        importStandalonePages: false,
      });

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Failed to fetch Tasks'),
        ])
      );
    });

    it('handles content fetching and conversion', async () => {
      vi.mocked(notionApi.getPageBlocks).mockResolvedValue([
        { type: 'paragraph' } as any,
      ]);
      vi.mocked(notionBlocks.convertNotionBlocks).mockReturnValue([
        { type: 'paragraph' } as any,
      ]);

      await importFromNotion({
        client: mockClient,
        store: mockStore,
        databases: [
          {
            database: { ...mockDb, icon: null },
            targetTypeId: 'task',
            selected: true,
          },
        ],
        importStandalonePages: false,
      });

      expect(notionApi.getPageBlocks).toHaveBeenCalled();
      expect(notionBlocks.convertNotionBlocks).toHaveBeenCalled();
      expect(mockStore.setContent).toHaveBeenCalled();
    });
  });

  it('handles error in loop for multiple databases', async () => {
    vi.mocked(notionApi.queryDatabase)
      .mockResolvedValueOnce([mockPageFn('p1', 'P1')])
      .mockRejectedValueOnce(new Error('DB2 Failed'));

    const result = await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [
        { database: mockDb, targetTypeId: 'task', selected: true },
        {
          database: { ...mockDb, id: 'db-2', name: 'DB 2' },
          targetTypeId: 'note',
          selected: true,
        },
      ],
      importStandalonePages: false,
    });

    expect(result.success).toBe(true); // Partial success is still success in this context, but errors logged
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch DB 2');
    expect(result.imported).toBe(1);
  });

  it('handles error in listStandalonePages', async () => {
    vi.mocked(notionApi.listStandalonePages).mockRejectedValue(
      new Error('Standalone Failed')
    );

    const result = await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [],
      importStandalonePages: true,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch standalone pages');
  });

  it('handles tag creation failure gracefully', async () => {
    vi.mocked(notionApi.queryDatabase).mockResolvedValue([
      mockPageFn('p1', 'P1'),
    ]);
    vi.mocked(notionProps.convertNotionProperties).mockReturnValue({
      properties: {},
      pendingTags: ['bad-tag'],
      pendingPeople: [],
      pendingRelations: new Map(),
    });
    // Mock create throwing for tag
    mockStore.create.mockImplementation((input: any) => {
      if (input.typeId === BuiltInTypeIds.TAG) throw new Error('Tag Error');
      return { id: 'obj-1', ...input };
    });

    const result = await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [{ database: mockDb, targetTypeId: 'task', selected: true }],
      importStandalonePages: false,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to create tag "bad-tag"');
    // Should still import page
    expect(result.imported).toBe(1);
  });

  it('handles page import failure (Promise.allSettled)', async () => {
    vi.mocked(notionApi.queryDatabase).mockResolvedValue([
      mockPageFn('p1', 'P1'),
    ]);
    // Mock create throwing for page
    mockStore.create.mockImplementation((input: any) => {
      if (input.typeId !== BuiltInTypeIds.TAG) throw new Error('Page Error');
      return { id: 'tag-1', ...input };
    });

    const result = await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [{ database: mockDb, targetTypeId: 'task', selected: true }],
      importStandalonePages: false,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to import page');
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('applies default status for tasks', async () => {
    vi.mocked(notionApi.queryDatabase).mockResolvedValue([
      mockPageFn('p1', 'Task 1'),
    ]);
    vi.mocked(notionProps.convertNotionProperties).mockReturnValue({
      properties: {}, // No status provided
      pendingTags: [],
      pendingPeople: [],
      pendingRelations: new Map(),
    });

    await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [
        {
          database: mockDb,
          targetTypeId: BuiltInTypeIds.TASK,
          selected: true,
        },
      ],
      importStandalonePages: false,
    });

    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.TASK,
        properties: expect.objectContaining({ status: 'todo' }),
      })
    );
  });

  it('falls back to name property if title missing (Project/Area)', async () => {
    vi.mocked(notionApi.queryDatabase).mockResolvedValue([
      mockPageFn('p1', 'Project A'),
    ]);
    vi.mocked(notionProps.convertNotionProperties).mockReturnValue({
      properties: {}, // No title/name
      pendingTags: [],
      pendingPeople: [],
      pendingRelations: new Map(),
    });

    await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [
        {
          database: mockDb,
          targetTypeId: BuiltInTypeIds.PROJECT,
          selected: true,
        },
      ],
      importStandalonePages: false,
    });

    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.PROJECT,
        properties: expect.objectContaining({ name: 'Project A' }),
      })
    );
  });

  it('warns but succeeds if content fetch fails', async () => {
    vi.mocked(notionApi.queryDatabase).mockResolvedValue([
      mockPageFn('p1', 'P1'),
    ]);
    vi.mocked(notionApi.getPageBlocks).mockRejectedValue(
      new Error('Content Fail')
    );
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await importFromNotion({
      client: mockClient,
      store: mockStore,
      databases: [{ database: mockDb, targetTypeId: 'task', selected: true }],
      importStandalonePages: false,
    });

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch content'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  describe('previewNotionImport', () => {
    it('generates preview for databases', async () => {
      const result = await previewNotionImport(
        mockClient,
        [
          {
            database: { ...mockDb, icon: null },
            targetTypeId: 'task',
            selected: true,
          },
        ],
        false
      );

      expect(result.databases).toHaveLength(1);
      expect(result.databases[0].pageCount).toBe(1);
      expect(result.databases[0].samplePages).toContain('Page 1');
    });

    it('includes standalone page count', async () => {
      vi.mocked(notionApi.listStandalonePages).mockResolvedValue([
        mockPageFn('s1', 'S1'),
        mockPageFn('s2', 'S2'),
      ]);

      const result = await previewNotionImport(mockClient, [], true);

      expect(result.standalonePageCount).toBe(2);
    });

    it('collects estimated tags', async () => {
      vi.mocked(notionProps.convertNotionProperties).mockReturnValue({
        properties: {},
        pendingTags: ['tagA', 'tagB'],
        pendingPeople: [],
        pendingRelations: new Map(),
      });

      const result = await previewNotionImport(
        mockClient,
        [
          {
            database: { ...mockDb, icon: null },
            targetTypeId: 'task',
            selected: true,
          },
        ],
        false
      );

      expect(result.estimatedTags).toEqual(['tagA', 'tagB']);
    });
  });
});
