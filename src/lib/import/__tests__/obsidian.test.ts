import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readVaultDirectory,
  parseVaultFiles,
  extractHashtags,
  inferTypeFromVaultFile,
  importObsidianVault,
  VaultFile,
  ParsedVaultFile,
} from '../obsidian';
import { BuiltInTypeIds } from '../../types';
import * as markdownApi from '../markdown';
import * as wikiLinksApi from '../wiki-links';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// Mock internal dependencies
vi.mock('../markdown');
vi.mock('../wiki-links');

describe('Obsidian Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(markdownApi.importMarkdown).mockReturnValue({
      title: 'Title',
      typeId: BuiltInTypeIds.NOTE,
      properties: {},
      blocks: [],
      wikiLinks: [],
      rawContent: '',
      errors: [],
    });

    vi.mocked(wikiLinksApi.convertWikiLinksToMentions).mockReturnValue({
      blocks: [],
      unresolvedLinks: [],
    });
  });

  describe('readVaultDirectory', () => {
    it('invokes Tauri command', async () => {
      mockInvoke.mockResolvedValue([{ path: 'note.md', content: 'content' }]);

      const result = await readVaultDirectory('/path/to/vault');

      expect(mockInvoke).toHaveBeenCalledWith('read_vault_directory', {
        directory: '/path/to/vault',
      });
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('note.md');
    });
  });

  describe('extractHashtags', () => {
    it('extracts unique hashtags', () => {
      const content =
        'Text with #tag1 and #tag2 and #tag1 again. Ignore # invalid';
      const tags = extractHashtags(content);
      expect(tags).toEqual(['tag1', 'tag2']);
    });

    it('handles tags at start of line', () => {
      expect(extractHashtags('#mytag')).toEqual(['mytag']);
    });

    it('normalizes to lowercase', () => {
      expect(extractHashtags('#MyTag')).toEqual(['mytag']);
    });
  });

  describe('parseVaultFiles', () => {
    it('parses files using importMarkdown', () => {
      const files: VaultFile[] = [
        { path: 'folder/Note.md', content: '# Hello #tag' },
      ];
      vi.mocked(markdownApi.importMarkdown).mockReturnValue({
        title: 'Hello',
        properties: {},
        blocks: [],
        wikiLinks: [],
        typeId: 'note',
        rawContent: '',
        errors: [],
      });

      const result = parseVaultFiles(files);

      expect(result[0].path).toBe('folder/Note.md');
      expect(result[0].name).toBe('Note');
      expect(result[0].hashtags).toEqual(['tag']);
      expect(markdownApi.importMarkdown).toHaveBeenCalled();
    });
  });

  it('extracts tags from frontmatter array', async () => {
    const mockStore = {
      getAll: vi.fn(() => []),
      create: vi.fn((input) => ({ id: 'obj-1', ...input })),
      setContent: vi.fn(),
    } as any;

    const files: VaultFile[] = [
      { path: 'Note.md', content: '---\ntags: [tagA, tagB]\n---\nContent' },
    ];
    vi.mocked(markdownApi.importMarkdown).mockReturnValue({
      title: 'Note',
      properties: { tags: ['tagA', 'tagB'] },
      blocks: [],
      wikiLinks: [],
      typeId: 'note',
      rawContent: '',
      errors: [],
    });

    const result = await importObsidianVault({
      store: mockStore,
      vaultPath: '/',
      files: parseVaultFiles(files),
    });

    expect(result.createdTags.has('taga')).toBe(true);
    expect(result.createdTags.has('tagb')).toBe(true);
  });
});

describe('inferTypeFromVaultFile', () => {
  const baseFile = {
    path: 'Note.md',
    name: 'Note',
    parsed: { typeId: undefined, properties: {} } as any,
    hashtags: [],
    selected: true,
  } as ParsedVaultFile;

  it('trusts frontmatter type', () => {
    const file = {
      ...baseFile,
      parsed: { ...baseFile.parsed, typeId: BuiltInTypeIds.PROJECT },
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.PROJECT);
  });

  it('infers from folder path', () => {
    const file = { ...baseFile, path: '/Projects/My Project.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.PROJECT);
  });

  it('infers meeting from path', () => {
    const file = { ...baseFile, path: '/Notes/Meetings/Weekly.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.MEETING);
  });

  it('infers person from path', () => {
    const file = { ...baseFile, path: '/People/John Doe.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.PERSON);
  });

  it('infers area from path', () => {
    const file = { ...baseFile, path: '/Areas/Finances.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.AREA);
  });

  it('infers from task properties', () => {
    const file = {
      ...baseFile,
      parsed: { ...baseFile.parsed, properties: { status: 'todo' } },
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.TASK);
  });

  it('infers from meeting properties', () => {
    const file = {
      ...baseFile,
      parsed: {
        ...baseFile.parsed,
        properties: { date: '2023-01-01', attendees: ['John'] },
      },
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.MEETING);
  });
});

describe('importObsidianVault', () => {
  const mockStore = {
    getAll: vi.fn(() => []),
    create: vi.fn((input) => ({ id: 'obj-1', ...input })),
    setContent: vi.fn(),
  } as any;

  const files: ParsedVaultFile[] = [
    {
      path: 'Note 1.md',
      name: 'Note 1',
      parsed: {
        title: 'Note 1',
        typeId: 'note',
        properties: {},
        blocks: [{ type: 'paragraph' }],
        wikiLinks: ['Note 2'],
      } as any,
      hashtags: ['tag1'],
      selected: true,
    },
    {
      path: 'Folder/Note 2.md',
      name: 'Note 2',
      parsed: {
        title: 'Note 2',
        typeId: 'note',
        properties: {},
        blocks: [{ type: 'paragraph' }],
        wikiLinks: [],
      } as any,
      hashtags: [],
      selected: true,
    },
  ];

  beforeEach(() => {
    mockStore.create.mockClear();
    mockStore.setContent.mockClear();
  });

  it('creates tags and objects', async () => {
    mockStore.create.mockImplementation((input: any) => ({
      id: input.typeId === 'tag' ? 'tag-id' : 'obj-id',
      ...input,
    }));

    await importObsidianVault({
      store: mockStore,
      vaultPath: '/',
      files,
    });

    // Verify tag creation
    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.TAG,
        properties: { title: 'tag1' },
      })
    );

    // Verify object creation
    expect(mockStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ title: 'Note 1' }),
      })
    );
  });

  it('resolves wiki links by exact match', async () => {
    mockStore.create.mockReturnValue({ id: 'target-id' });
    const testFiles: ParsedVaultFile[] = [
      {
        path: 'Source.md',
        name: 'Source',
        parsed: {
          blocks: [{ type: 'paragraph' }],
          wikiLinks: ['Target'],
          properties: {},
        } as any,
        hashtags: [],
        selected: true,
      },
      {
        path: 'Target.md',
        name: 'Target',
        parsed: { blocks: [], wikiLinks: [], properties: {} } as any,
        hashtags: [],
        selected: true,
      },
    ];

    await importObsidianVault({
      store: mockStore,
      vaultPath: '/',
      files: testFiles,
    });

    // Wiki link resolution happens in post-process
    // Verify setContent was called (once for source creation, once for linking phase)
    expect(mockStore.setContent).toHaveBeenCalledTimes(2);
  });

  it('resolves wiki links by filename match', async () => {
    // Similar setup but target is nested
    const testFiles: ParsedVaultFile[] = [
      {
        path: 'Source.md',
        name: 'Source',
        parsed: {
          blocks: [{ type: 'paragraph' }],
          wikiLinks: ['Target'],
          properties: {},
        } as any,
        hashtags: [],
        selected: true,
      },
      {
        path: 'Folder/Target.md',
        name: 'Target',
        parsed: { blocks: [], wikiLinks: [], properties: {} } as any,
        hashtags: [],
        selected: true,
      },
    ];

    await importObsidianVault({
      store: mockStore,
      vaultPath: '/',
      files: testFiles,
    });
    expect(mockStore.setContent).toHaveBeenCalled();
  });

  it('warns when wiki link resolution fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const testFiles: ParsedVaultFile[] = [
      {
        path: 'Source.md',
        name: 'Source',
        parsed: {
          blocks: [{ type: 'paragraph' }],
          wikiLinks: ['NonExistent'],
          properties: {},
        } as any,
        hashtags: [],
        selected: true,
      },
    ];

    vi.mocked(wikiLinksApi.convertWikiLinksToMentions).mockImplementationOnce(
      () => {
        throw new Error('Resolution Error');
      }
    );

    await importObsidianVault({
      store: mockStore,
      vaultPath: '/',
      files: testFiles,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve wiki-links'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('handles store.create errors gracefully', async () => {
    const failingStore = {
      getAll: vi.fn(() => []),
      create: vi.fn().mockImplementation((input: { typeId?: string }) => {
        // Fail on note creation, succeed on tag creation
        if (input.typeId !== BuiltInTypeIds.TAG) {
          throw new Error('Database write failed');
        }
        return { id: 'tag-id', ...input };
      }),
      setContent: vi.fn(),
    } as any;

    const testFiles: ParsedVaultFile[] = [
      {
        path: 'FailingNote.md',
        name: 'FailingNote',
        parsed: {
          title: 'Failing Note',
          typeId: 'note',
          properties: {},
          blocks: [{ type: 'paragraph' }],
          wikiLinks: [],
        } as any,
        hashtags: [],
        selected: true,
      },
    ];

    const result = await importObsidianVault({
      store: failingStore,
      vaultPath: '/',
      files: testFiles,
    });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Database write failed');
    expect(result.imported).toBe(0);
  });

  it('handles wiki-links with heading anchors', async () => {
    mockStore.create.mockReturnValue({ id: 'target-id' });

    // Mock convertWikiLinksToMentions to capture the resolver function
    let capturedResolver:
      | ((target: string) => { id: string; typeId?: string } | null)
      | undefined;
    vi.mocked(wikiLinksApi.convertWikiLinksToMentions).mockImplementation(
      (_blocks, resolver) => {
        capturedResolver = resolver;
        return { blocks: [], unresolvedLinks: [] };
      }
    );

    const testFiles: ParsedVaultFile[] = [
      {
        path: 'Source.md',
        name: 'Source',
        parsed: {
          blocks: [{ type: 'paragraph' }],
          wikiLinks: ['Target#section'],
          properties: {},
        } as any,
        hashtags: [],
        selected: true,
      },
      {
        path: 'Target.md',
        name: 'Target',
        parsed: {
          blocks: [{ type: 'paragraph' }],
          wikiLinks: [],
          properties: {},
        } as unknown as import('../types').MarkdownImportResult,
        hashtags: [],
        selected: true,
      },
    ];

    await importObsidianVault({
      store: mockStore,
      vaultPath: '/',
      files: testFiles,
    });

    // Verify the resolver handles #heading anchors correctly
    expect(capturedResolver).toBeDefined();
    if (capturedResolver) {
      // The resolver should strip the #section part and find 'Target'
      const result = capturedResolver('Target#section');
      expect(result).not.toBeNull();
    }
  });
});

describe('inferTypeFromVaultFile additional cases', () => {
  const baseFile = {
    path: 'Note.md',
    name: 'Note',
    parsed: {
      typeId: undefined,
      properties: {},
    } as unknown as import('../types').MarkdownImportResult,
    hashtags: [],
    selected: true,
  } as ParsedVaultFile;

  it('infers task from /todo/ folder path', () => {
    const file = { ...baseFile, path: '/ToDo/My Task.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.TASK);
  });

  it('infers task from due property', () => {
    const file = {
      ...baseFile,
      parsed: { ...baseFile.parsed, properties: { due: '2024-01-01' } } as any,
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.TASK);
  });

  it('infers task from dueDate property', () => {
    const file = {
      ...baseFile,
      parsed: {
        ...baseFile.parsed,
        properties: { dueDate: '2024-01-01' },
      } as any,
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.TASK);
  });

  it('infers task from priority property', () => {
    const file = {
      ...baseFile,
      parsed: { ...baseFile.parsed, properties: { priority: 'high' } } as any,
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.TASK);
  });

  it('infers person from /contacts/ folder path', () => {
    const file = { ...baseFile, path: '/Contacts/Jane Doe.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.PERSON);
  });

  it('infers meeting from participants property', () => {
    const file = {
      ...baseFile,
      parsed: {
        ...baseFile.parsed,
        properties: { date: '2024-01-01', participants: ['John'] },
      } as any,
    };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.MEETING);
  });

  it('defaults to NOTE when no other type matches', () => {
    const file = { ...baseFile, path: '/Random/Something.md' };
    expect(inferTypeFromVaultFile(file).typeId).toBe(BuiltInTypeIds.NOTE);
  });
});
