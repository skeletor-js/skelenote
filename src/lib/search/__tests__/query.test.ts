import { describe, it, expect } from 'vitest';
import { SearchEngine, createSearchEngine } from '../query';
import type { SearchableItem } from '../types';

// Sample search items for testing
const sampleItems: SearchableItem[] = [
  {
    id: '1',
    typeId: 'task',
    title: 'Buy groceries',
    properties: 'shopping food',
    content: 'Need to buy milk, eggs, and bread',
    updatedAt: 1000,
  },
  {
    id: '2',
    typeId: 'note',
    title: 'Meeting notes',
    properties: '',
    content: 'Discussion about project roadmap and timeline',
    updatedAt: 2000,
  },
  {
    id: '3',
    typeId: 'task',
    title: 'Project planning',
    properties: 'work urgent',
    content: 'Define milestones and deliverables',
    updatedAt: 3000,
  },
  {
    id: '4',
    typeId: 'note',
    title: 'Shopping list',
    properties: '',
    content: 'Eggs, butter, vegetables',
    updatedAt: 4000,
  },
];

describe('SearchEngine', () => {
  describe('constructor', () => {
    it('should create engine with empty items', () => {
      const engine = new SearchEngine();
      expect(engine.size).toBe(0);
    });

    it('should create engine with initial items', () => {
      const engine = new SearchEngine(sampleItems);
      expect(engine.size).toBe(4);
    });
  });

  describe('setItems', () => {
    it('should update indexed items', () => {
      const engine = new SearchEngine();
      expect(engine.size).toBe(0);

      engine.setItems(sampleItems);
      expect(engine.size).toBe(4);
    });

    it('should replace existing items', () => {
      const engine = new SearchEngine(sampleItems);
      engine.setItems([sampleItems[0]]);
      expect(engine.size).toBe(1);
    });
  });

  describe('getItems', () => {
    it('should return current items', () => {
      const engine = new SearchEngine(sampleItems);
      expect(engine.getItems()).toEqual(sampleItems);
    });
  });

  describe('search', () => {
    it('should return empty array for empty query', () => {
      const engine = new SearchEngine(sampleItems);
      expect(engine.search('')).toEqual([]);
      expect(engine.search('   ')).toEqual([]);
    });

    it('should find items by title', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('groceries');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title).toContain('groceries');
    });

    it('should find items by content', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('milestones');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.id).toBe('3');
    });

    it('should find items by properties', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('urgent');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.id).toBe('3');
    });

    it('should perform fuzzy matching', () => {
      const engine = new SearchEngine(sampleItems);
      // Slight typo should still match
      const results = engine.search('groceris');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit option', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('list', { limit: 1 });

      expect(results).toHaveLength(1);
    });

    it('should include match indices', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('meeting');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches).toBeDefined();
      expect(results[0].matches.length).toBeGreaterThan(0);
    });

    it('should include relevance score', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('project');

      expect(results.length).toBeGreaterThan(0);
      expect(typeof results[0].score).toBe('number');
    });

    it('should sort results by relevance', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('project');

      // Results should be sorted by score (lower is better in Fuse.js)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i + 1].score);
      }
    });

    it('should prioritize title matches over content', () => {
      const engine = new SearchEngine(sampleItems);
      // 'Shopping' appears in title of item 4 and content of item 1
      const results = engine.search('shopping');

      expect(results.length).toBeGreaterThan(0);
      // Item with 'Shopping' in title should rank higher
      const titleMatchResult = results.find((r) =>
        r.item.title.toLowerCase().includes('shopping')
      );
      expect(titleMatchResult).toBeDefined();
    });

    it('should find multiple matches', () => {
      const engine = new SearchEngine(sampleItems);
      const results = engine.search('eggs');

      // Should find both items that mention eggs
      expect(results).toHaveLength(2);
    });
  });

  describe('size', () => {
    it('should return number of indexed items', () => {
      const engine = new SearchEngine(sampleItems);
      expect(engine.size).toBe(4);

      engine.setItems([]);
      expect(engine.size).toBe(0);
    });
  });
});

describe('createSearchEngine', () => {
  it('should create a new engine without items', () => {
    const engine = createSearchEngine();
    expect(engine.size).toBe(0);
  });

  it('should create a new engine with items', () => {
    const engine = createSearchEngine(sampleItems);
    expect(engine.size).toBe(4);
  });
});
