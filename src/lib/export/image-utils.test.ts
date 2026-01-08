/**
 * Tests for Image Utilities
 *
 * Covers image URL conversion to base64 for PDF embedding.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  imageUrlToBase64,
  processImagesInContent,
  isValidImageUrl,
} from './image-utils';
import type { BlockNoteBlock } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────

// Mock Tauri filesystem
vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(),
}));

// Import mocked function for assertions
import { readFile } from '@tauri-apps/plugin-fs';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FileReader for blob conversion
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(blob: Blob) {
    // Simulate async read
    setTimeout(() => {
      // Simple mock: convert blob type to data URI
      this.result = `data:${blob.type};base64,mock-base64-data`;
      if (this.onload) this.onload();
    }, 0);
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

describe('Image Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // isValidImageUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('isValidImageUrl', () => {
    it('returns true for data: URIs', () => {
      expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(true);
    });

    it('returns true for file:// URLs', () => {
      expect(isValidImageUrl('file:///path/to/image.png')).toBe(true);
    });

    it('returns true for http:// URLs', () => {
      expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('returns true for https:// URLs', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('returns true for blob: URLs', () => {
      expect(isValidImageUrl('blob:http://localhost:1420/abc-123')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidImageUrl('')).toBe(false);
    });

    it('returns false for relative paths', () => {
      expect(isValidImageUrl('./image.png')).toBe(false);
      expect(isValidImageUrl('../images/photo.jpg')).toBe(false);
    });

    it('returns false for absolute file paths without file://', () => {
      expect(isValidImageUrl('/Users/name/image.png')).toBe(false);
    });

    it('returns false for non-image protocols', () => {
      expect(isValidImageUrl('ftp://server.com/image.png')).toBe(false);
      expect(isValidImageUrl('ws://localhost/image')).toBe(false);
    });

    it('returns false for malformed URLs', () => {
      expect(isValidImageUrl('not a url')).toBe(false);
      // Note: 'http://' passes startsWith check, so it's technically valid
      // The actual fetch will fail, but isValidImageUrl only checks prefix
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // imageUrlToBase64 - data: URIs
  // ─────────────────────────────────────────────────────────────────────────

  describe('imageUrlToBase64 - data URIs', () => {
    it('passes through data: URIs unchanged', async () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
      const result = await imageUrlToBase64(dataUri);
      expect(result).toBe(dataUri);
    });

    it('handles data URIs with different MIME types', async () => {
      const uris = [
        'data:image/jpeg;base64,abc',
        'data:image/gif;base64,def',
        'data:image/webp;base64,ghi',
      ];

      for (const uri of uris) {
        const result = await imageUrlToBase64(uri);
        expect(result).toBe(uri);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // imageUrlToBase64 - file:// URLs
  // ─────────────────────────────────────────────────────────────────────────

  describe('imageUrlToBase64 - file URLs', () => {
    it('reads file via Tauri and converts to base64', async () => {
      const mockData = new Uint8Array([137, 80, 78, 71]); // PNG header
      vi.mocked(readFile).mockResolvedValue(mockData);

      const result = await imageUrlToBase64('file:///path/to/image.png');

      expect(readFile).toHaveBeenCalledWith('/path/to/image.png');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('detects MIME type from file extension', async () => {
      const mockData = new Uint8Array([0, 1, 2]);
      vi.mocked(readFile).mockResolvedValue(mockData);

      const extensions = [
        { path: 'file:///image.jpg', mime: 'image/jpeg' },
        { path: 'file:///image.jpeg', mime: 'image/jpeg' },
        { path: 'file:///image.png', mime: 'image/png' },
        { path: 'file:///image.gif', mime: 'image/gif' },
        { path: 'file:///image.webp', mime: 'image/webp' },
        { path: 'file:///image.svg', mime: 'image/svg+xml' },
        { path: 'file:///image.bmp', mime: 'image/bmp' },
        { path: 'file:///favicon.ico', mime: 'image/x-icon' },
      ];

      for (const { path, mime } of extensions) {
        const result = await imageUrlToBase64(path);
        // Escape special regex characters in MIME type (/, +)
        const escapedMime = mime.replace(/[/+]/g, '\\$&');
        expect(result).toMatch(new RegExp(`^data:${escapedMime};base64,`));
      }
    });

    it('defaults to image/png for unknown extensions', async () => {
      const mockData = new Uint8Array([0, 1, 2]);
      vi.mocked(readFile).mockResolvedValue(mockData);

      const result = await imageUrlToBase64('file:///image.xyz');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('handles uppercase file extensions', async () => {
      const mockData = new Uint8Array([0, 1, 2]);
      vi.mocked(readFile).mockResolvedValue(mockData);

      const result = await imageUrlToBase64('file:///image.PNG');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('returns original URL on read error', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      const url = 'file:///missing.png';
      const result = await imageUrlToBase64(url);

      expect(result).toBe(url);
    });

    it('encodes binary data to base64 correctly', async () => {
      const mockData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      vi.mocked(readFile).mockResolvedValue(mockData);

      const result = await imageUrlToBase64('file:///test.png');

      // Extract base64 portion
      const base64 = result.split(',')[1];
      expect(base64).toBeDefined();

      // btoa("Hello") = "SGVsbG8="
      expect(base64).toBe('SGVsbG8=');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // imageUrlToBase64 - HTTP/HTTPS URLs
  // ─────────────────────────────────────────────────────────────────────────

  describe('imageUrlToBase64 - HTTP URLs', () => {
    it('fetches HTTP URL and converts to base64', async () => {
      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await imageUrlToBase64('http://example.com/image.jpg');

      expect(mockFetch).toHaveBeenCalledWith('http://example.com/image.jpg');
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('fetches HTTPS URL and converts to base64', async () => {
      const mockBlob = new Blob(['fake image data'], { type: 'image/png' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await imageUrlToBase64('https://example.com/image.png');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.png');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('returns original URL on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const url = 'https://example.com/image.jpg';
      const result = await imageUrlToBase64(url);

      expect(result).toBe(url);
    });

    it('returns original URL on HTTP error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const url = 'https://example.com/missing.jpg';
      const result = await imageUrlToBase64(url);

      expect(result).toBe(url);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // imageUrlToBase64 - blob: URLs
  // ─────────────────────────────────────────────────────────────────────────

  describe('imageUrlToBase64 - blob URLs', () => {
    it('fetches blob URL and converts to base64', async () => {
      const mockBlob = new Blob(['blob data'], { type: 'image/png' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await imageUrlToBase64(
        'blob:http://localhost:1420/abc-123'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'blob:http://localhost:1420/abc-123'
      );
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('returns original URL on blob fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Blob revoked'));

      const url = 'blob:http://localhost:1420/revoked';
      const result = await imageUrlToBase64(url);

      expect(result).toBe(url);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // imageUrlToBase64 - Unknown URLs
  // ─────────────────────────────────────────────────────────────────────────

  describe('imageUrlToBase64 - unknown URLs', () => {
    it('returns unknown URL types unchanged', async () => {
      const unknownUrls = [
        'ftp://server.com/image.png',
        '/absolute/path/image.jpg',
        './relative/path/image.png',
        'just-a-filename.png',
      ];

      for (const url of unknownUrls) {
        const result = await imageUrlToBase64(url);
        expect(result).toBe(url);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // processImagesInContent
  // ─────────────────────────────────────────────────────────────────────────

  describe('processImagesInContent', () => {
    it('processes image blocks and converts URLs', async () => {
      const mockBlob = new Blob(['image'], { type: 'image/png' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { url: 'https://example.com/image.png' },
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('image');
      expect(result[0].props?.url).toMatch(/^data:image\/png;base64,/);
    });

    it('processes nested image blocks in children', async () => {
      const mockBlob = new Blob(['image'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const blocks: BlockNoteBlock[] = [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              props: { url: 'https://example.com/nested.jpg' },
            },
          ],
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result[0].children?.[0].type).toBe('image');
      expect(result[0].children?.[0].props?.url).toMatch(
        /^data:image\/jpeg;base64,/
      );
    });

    it('preserves non-image blocks unchanged', async () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          type: 'heading',
          props: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('paragraph');
      expect(result[1].type).toBe('heading');
    });

    it('handles mixed content with images and text', async () => {
      const mockBlob = new Blob(['image'], { type: 'image/png' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const blocks: BlockNoteBlock[] = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before' }],
        },
        {
          type: 'image',
          props: { url: 'https://example.com/photo.png' },
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After' }],
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('paragraph');
      expect(result[1].type).toBe('image');
      expect(result[1].props?.url).toMatch(/^data:/);
      expect(result[2].type).toBe('paragraph');
    });

    it('handles image blocks without URL prop', async () => {
      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { caption: 'No URL' },
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('image');
      // Should not crash, just pass through
    });

    it('handles empty blocks array', async () => {
      const result = await processImagesInContent([]);
      expect(result).toEqual([]);
    });

    it('processes multiple images in sequence', async () => {
      const mockBlob = new Blob(['image'], { type: 'image/png' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { url: 'https://example.com/1.png' },
        },
        {
          type: 'image',
          props: { url: 'https://example.com/2.png' },
        },
        {
          type: 'image',
          props: { url: 'https://example.com/3.png' },
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result).toHaveLength(3);
      result.forEach((block) => {
        expect(block.props?.url).toMatch(/^data:/);
      });
    });

    it('deeply nested children are processed', async () => {
      const mockBlob = new Blob(['image'], { type: 'image/png' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const blocks: BlockNoteBlock[] = [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'image',
                  props: { url: 'https://example.com/deep.png' },
                },
              ],
            },
          ],
        },
      ];

      const result = await processImagesInContent(blocks);

      const deepImage = result[0].children?.[0].children?.[0];
      expect(deepImage?.type).toBe('image');
      expect(deepImage?.props?.url).toMatch(/^data:/);
    });

    it('preserves original block structure', async () => {
      const blocks: BlockNoteBlock[] = [
        {
          id: 'block-1',
          type: 'paragraph',
          props: { backgroundColor: 'yellow' },
          content: [{ type: 'text', text: 'Test' }],
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result[0].id).toBe('block-1');
      expect(result[0].props?.backgroundColor).toBe('yellow');
      expect(result[0].content).toEqual([{ type: 'text', text: 'Test' }]);
    });

    it('handles data URIs without conversion', async () => {
      const dataUri = 'data:image/png;base64,abc123';
      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { url: dataUri },
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result[0].props?.url).toBe(dataUri);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('continues processing after conversion error', async () => {
      // First call fails, second succeeds
      const mockBlob = new Blob(['image'], { type: 'image/png' });
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        });

      const blocks: BlockNoteBlock[] = [
        {
          type: 'image',
          props: { url: 'https://example.com/fail.png' },
        },
        {
          type: 'image',
          props: { url: 'https://example.com/success.png' },
        },
      ];

      const result = await processImagesInContent(blocks);

      expect(result).toHaveLength(2);
      // First image returns original URL
      expect(result[0].props?.url).toBe('https://example.com/fail.png');
      // Second image converts successfully
      expect(result[1].props?.url).toMatch(/^data:/);
    });
  });
});
