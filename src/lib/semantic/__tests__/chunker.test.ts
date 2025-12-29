import { describe, it, expect } from 'vitest';
import { chunkText, estimateTokenCount, needsChunking } from '../chunker';

describe('chunkText', () => {
  describe('empty and short content', () => {
    it('returns empty array for empty string', () => {
      expect(chunkText('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      expect(chunkText('   \n\t  ')).toEqual([]);
    });

    it('returns single chunk for short text', () => {
      const text = 'This is a short text.';
      const chunks = chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].startIndex).toBe(0);
      expect(chunks[0].endIndex).toBe(text.length);
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it('trims whitespace from text', () => {
      const text = '  Some text with spaces  ';
      const chunks = chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('Some text with spaces');
    });
  });

  describe('sentence boundary preservation', () => {
    it('splits at sentence boundaries', () => {
      const text =
        'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
      const chunks = chunkText(text, { maxChunkSize: 50, overlap: 10 });

      // Each chunk should contain complete sentences
      for (const chunk of chunks) {
        // Should not start with lowercase (indicating mid-sentence)
        if (chunk.text.length > 0) {
          expect(chunk.text[0]).toMatch(/[A-Z]/);
        }
      }
    });

    it('handles question marks as sentence boundaries', () => {
      const text = 'Is this a question? Yes it is. Another question? Indeed.';
      const chunks = chunkText(text, { maxChunkSize: 30, overlap: 5 });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('handles exclamation marks as sentence boundaries', () => {
      const text = 'Wow! This is exciting! So much fun! Amazing!';
      const chunks = chunkText(text, { maxChunkSize: 25, overlap: 5 });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('handles paragraph breaks as boundaries', () => {
      const text = 'First paragraph content.\n\nSecond paragraph content.';
      const chunks = chunkText(text, { maxChunkSize: 30, overlap: 5 });

      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('chunking without sentence preservation', () => {
    it('splits by character count when preserveSentences is false', () => {
      const text = 'This is a long text without proper sentence boundaries it just keeps going and going';
      const chunks = chunkText(text, {
        maxChunkSize: 30,
        overlap: 5,
        preserveSentences: false,
      });

      expect(chunks.length).toBeGreaterThan(1);
      // First chunk should be around maxChunkSize
      expect(chunks[0].text.length).toBeLessThanOrEqual(30);
    });
  });

  describe('overlap handling', () => {
    it('creates overlapping chunks', () => {
      const text =
        'Sentence one is here. Sentence two follows. Sentence three appears. Sentence four ends.';
      const chunks = chunkText(text, { maxChunkSize: 50, overlap: 20 });

      if (chunks.length > 1) {
        // Check that consecutive chunks have some overlap
        for (let i = 1; i < chunks.length; i++) {
          const prevEnd = chunks[i - 1].endIndex;
          const currStart = chunks[i].startIndex;
          // There should be some overlap (startIndex of next is before endIndex of previous)
          // or at least close together
          expect(currStart).toBeLessThanOrEqual(prevEnd + 10);
        }
      }
    });
  });

  describe('chunk index tracking', () => {
    it('assigns sequential chunk indices', () => {
      const text =
        'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.';
      const chunks = chunkText(text, { maxChunkSize: 40, overlap: 10 });

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].chunkIndex).toBe(i);
      }
    });
  });

  describe('long single sentences', () => {
    it('handles sentences longer than maxChunkSize', () => {
      const longSentence =
        'This is a very long sentence that exceeds the maximum chunk size and needs to be split into multiple parts by words rather than sentence boundaries.';
      const chunks = chunkText(longSentence, { maxChunkSize: 50, overlap: 10 });

      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should not exceed maxChunkSize by much
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThan(70); // Allow some flexibility
      }
    });
  });

  describe('real-world content', () => {
    it('handles typical note content', () => {
      const text = `
        Meeting Notes - Q4 Planning

        We discussed the roadmap for Q4. The main priorities are:
        1. Finish the semantic search feature
        2. Improve sync reliability
        3. Add mobile support

        Action items:
        - John will review the search implementation
        - Sarah will test sync across devices
        - Mike will start mobile research

        Next meeting scheduled for next week.
      `.trim();

      const chunks = chunkText(text, { maxChunkSize: 150, overlap: 30 });

      expect(chunks.length).toBeGreaterThan(0);
      // All original content should be covered
      const allText = chunks.map((c) => c.text).join(' ');
      expect(allText).toContain('Q4 Planning');
      expect(allText).toContain('semantic search');
      expect(allText).toContain('next week');
    });

    it('handles code-like content', () => {
      const text = `
        function calculateTotal(items) {
          return items.reduce((sum, item) => sum + item.price, 0);
        }

        const result = calculateTotal([{price: 10}, {price: 20}]);
        console.log(result);
      `.trim();

      const chunks = chunkText(text, { maxChunkSize: 100, overlap: 20 });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});

describe('estimateTokenCount', () => {
  it('estimates tokens for English text', () => {
    // Roughly 4 characters per token
    const text = 'This is a test sentence with some words.';
    const estimate = estimateTokenCount(text);

    // 42 characters / 4 = ~10-11 tokens
    expect(estimate).toBeGreaterThanOrEqual(10);
    expect(estimate).toBeLessThanOrEqual(15);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });
});

describe('needsChunking', () => {
  it('returns false for short text', () => {
    const shortText = 'This is short.';
    expect(needsChunking(shortText)).toBe(false);
  });

  it('returns true for long text', () => {
    const longText = 'word '.repeat(600); // ~3000 characters, ~750 tokens
    expect(needsChunking(longText)).toBe(true);
  });

  it('respects custom maxTokens parameter', () => {
    const text = 'word '.repeat(50); // ~250 characters, ~62 tokens
    expect(needsChunking(text, 50)).toBe(true);
    expect(needsChunking(text, 100)).toBe(false);
  });
});
