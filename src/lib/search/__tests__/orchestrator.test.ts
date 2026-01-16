import { describe, it, expect } from 'vitest';
import { fuseSearchResults, semanticToSearchResults } from '../orchestrator';
import type { SearchResult, SearchableItem } from '../types';
import type { SemanticSearchResult } from '../../semantic/types';

describe('Search Orchestrator', () => {
  // Helper to create a dummy searchable item
  const createItem = (id: string, title = 'Test Item'): SearchableItem => ({
    id,
    typeId: 'note',
    title,
    properties: '',
    content: 'content',
    updatedAt: Date.now(),
  });

  const item1 = createItem('1', 'Item One');
  const item2 = createItem('2', 'Item Two');
  const item3 = createItem('3', 'Item Three');

  const itemsMap = new Map<string, SearchableItem>([
    ['1', item1],
    ['2', item2],
    ['3', item3],
  ]);

  describe('fuseSearchResults (RRF)', () => {
    it('should handle empty inputs', () => {
      const results = fuseSearchResults([], [], itemsMap);
      expect(results).toEqual([]);
    });

    it('should return text-only results when no semantic results', () => {
      const textResults: SearchResult[] = [
        { item: item1, score: 0.1, matches: [] },
        { item: item2, score: 0.2, matches: [] },
      ];

      const results = fuseSearchResults(textResults, [], itemsMap);

      expect(results).toHaveLength(2);
      expect(results[0].item.id).toBe('1');
      expect(results[0].matchType).toBe('text');
      // Verify RRF scoring: Only text rank contributes
      // Rank 1: 0.5 * (1 / (60 + 1))
      // Rank 2: 0.5 * (1 / (60 + 2))
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should return semantic-only results when no text results', () => {
      const semanticResults: SemanticSearchResult[] = [
        { objectId: '2', score: 0.9 },
        { objectId: '3', score: 0.8 },
      ];

      const results = fuseSearchResults([], semanticResults, itemsMap);

      expect(results).toHaveLength(2);
      expect(results[0].item.id).toBe('2');
      expect(results[0].matchType).toBe('semantic');
      expect(results[0].semanticScore).toBe(0.9);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should combine and boost hybrid matches', () => {
      // Item 2 is in BOTH
      // Item 1 is text only
      // Item 3 is semantic only

      const textResults: SearchResult[] = [
        { item: item1, score: 0.1, matches: [] }, // Rank 1
        { item: item2, score: 0.2, matches: [] }, // Rank 2
      ];

      const semanticResults: SemanticSearchResult[] = [
        { objectId: '3', score: 0.95 }, // Rank 1
        { objectId: '2', score: 0.85 }, // Rank 2
      ];

      const results = fuseSearchResults(textResults, semanticResults, itemsMap);

      expect(results).toHaveLength(3);

      // Verify Item 2 (Hybrid) details
      const hybrid = results.find((r) => r.item.id === '2');
      expect(hybrid).toBeDefined();
      expect(hybrid?.matchType).toBe('hybrid');
      expect(hybrid?.semanticScore).toBe(0.85);

      // Verify sorting:
      // Item 2 has Text Rank 2 + Semantic Rank 2
      // Item 1 has Text Rank 1
      // Item 3 has Semantic Rank 1
      // Exact ordering depends on RRF K=60.
      // Score(2) = 0.5/(62) + 0.5/(62) = 1/62 ≈ 0.0161
      // Score(1) = 0.5/(61) ≈ 0.0082
      // Score(3) = 0.5/(61) ≈ 0.0082
      // So Hybrid should win!
      expect(results[0].item.id).toBe('2');
    });

    it('should handle missing searchable items gracefully', () => {
      const semanticResults: SemanticSearchResult[] = [
        { objectId: 'missing', score: 0.9 },
      ];

      const results = fuseSearchResults([], semanticResults, new Map());

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe('missing');
      expect(results[0].item.typeId).toBe('unknown');
    });
  });

  describe('semanticToSearchResults', () => {
    it('should convert semantic results', () => {
      const semanticResults: SemanticSearchResult[] = [
        { objectId: '1', score: 0.88 },
      ];

      const results = semanticToSearchResults(semanticResults, itemsMap);

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe('1');
      expect(results[0].score).toBe(0.88); // Should preserve score
      expect(results[0].matchType).toBe('semantic');
    });

    it('should handle missing items', () => {
      const semanticResults: SemanticSearchResult[] = [
        { objectId: '999', score: 0.5 },
      ];

      const results = semanticToSearchResults(semanticResults, itemsMap);

      expect(results[0].item.title).toBe('Unknown');
    });
  });
});
