/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotionClient } from '../notion-api';
import { convertNotionBlocks } from '../notion-blocks';
import { importFromNotion } from '../notion-import';
import { BuiltInTypeIds } from '../../types';

// Mock dependencies
const mockFetch = vi.fn();
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: (...args: any[]) => mockFetch(...args),
}));

// Mock store
const mockStore = {
  create: vi.fn(),
  setContent: vi.fn(),
  getByType: vi.fn().mockReturnValue([]),
};

describe('Notion Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotionClient', () => {
    it('should make authenticated requests', async () => {
      const client = createNotionClient('secret-token');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-1', name: 'User' }),
      });

      const user = await client.getMe();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-token',
          }),
        })
      );
      expect(user.id).toBe('user-1');
    });

    it('should handle API errors', async () => {
      const client = createNotionClient('secret-token');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized', code: 'unauthorized' }),
      });

      await expect(client.getMe()).rejects.toThrow('Unauthorized');
    });

    it('should respect rate limits (basic check)', async () => {
      const client = createNotionClient('token');
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      const p1 = client.getMe();
      const p2 = client.getMe();
      const p3 = client.getMe();

      await Promise.all([p1, p2, p3]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Block Conversion', () => {
    it('should convert paragraph', () => {
      const block: any = {
        id: 'b1',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', plain_text: 'Hello', annotations: { bold: true } },
          ],
        },
      };

      const converted = convertNotionBlocks([block]);
      expect(converted).toHaveLength(1);
      expect(converted[0].type).toBe('paragraph');
      expect(converted[0].content).toHaveLength(1);
      // @ts-ignore
      expect(converted[0].content[0].text).toBe('Hello');
      // @ts-ignore
      expect(converted[0].content[0].styles.bold).toBe(true);
    });

    it('should convert heading', () => {
      const block: any = {
        id: 'b2',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', plain_text: 'Header' }],
        },
      };

      const converted = convertNotionBlocks([block]);
      expect(converted[0].type).toBe('heading');
      expect(converted[0].props?.level).toBe(1);
    });
  });

  describe('Import Orchestration', () => {
    const client = createNotionClient('token');

    it('should import database pages', async () => {
      // Mock db query response
      mockFetch.mockImplementation(async (url) => {
        if (url.includes('/query')) {
          return {
            ok: true,
            json: async () => ({
              results: [
                {
                  id: 'page-1',
                  title: 'Test Page',
                  created_time: '2023-01-01',
                  last_edited_time: '2023-01-01',
                  properties: {
                    Name: {
                      type: 'title',
                      title: [{ plain_text: 'Test Page' }],
                    },
                  },
                },
              ],
              has_more: false,
            }),
          };
        }
        if (url.includes('/blocks')) {
          return {
            ok: true,
            json: async () => ({
              results: [],
              has_more: false,
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      mockStore.create.mockReturnValue({ id: 'obj-1' });

      const result = await importFromNotion({
        client,
        store: mockStore as any,
        databases: [
          {
            database: { id: 'db-1', name: 'DB', properties: [], icon: null },
            targetTypeId: BuiltInTypeIds.NOTE,
            selected: true,
          },
        ],
        importStandalonePages: false,
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(mockStore.create).toHaveBeenCalled();
      expect(result.idMapping.get('page-1')).toEqual({
        objectId: 'obj-1',
        typeId: BuiltInTypeIds.NOTE,
        title: 'Test Page',
      });
    });
  });
});
