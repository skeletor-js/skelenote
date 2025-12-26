/**
 * Search query execution using Fuse.js
 */

import Fuse, { type IFuseOptions, type FuseResult } from 'fuse.js';
import type { SearchableItem, SearchResult, SearchMatch, SearchOptions } from './types';

/**
 * Default Fuse.js configuration
 * Optimized for searching notes/tasks with title priority
 */
const DEFAULT_FUSE_OPTIONS: IFuseOptions<SearchableItem> = {
  keys: [
    { name: 'title', weight: 3 },      // Title is most important
    { name: 'properties', weight: 2 }, // Properties second
    { name: 'content', weight: 1 },    // Content lower priority
  ],
  threshold: 0.3,           // Fuzzy matching tolerance (0 = exact, 1 = match anything)
  includeMatches: true,     // Include match indices for highlighting
  includeScore: true,       // Include relevance score
  ignoreLocation: true,     // Search entire text, not just beginning
  minMatchCharLength: 2,    // Minimum chars to match
  findAllMatches: true,     // Find all matches in long text
};

/**
 * Convert Fuse.js result to our SearchResult format
 */
function convertFuseResult(
  fuseResult: FuseResult<SearchableItem>
): SearchResult {
  const matches: SearchMatch[] = [];

  if (fuseResult.matches) {
    for (const match of fuseResult.matches) {
      if (match.key && match.value && match.indices) {
        matches.push({
          key: match.key as 'title' | 'properties' | 'content',
          value: match.value,
          indices: match.indices as ReadonlyArray<readonly [number, number]>,
        });
      }
    }
  }

  return {
    item: fuseResult.item,
    score: fuseResult.score ?? 0,
    matches,
  };
}

/**
 * Search engine class for executing queries
 */
export class SearchEngine {
  private fuse: Fuse<SearchableItem>;
  private items: SearchableItem[];

  constructor(items: SearchableItem[] = []) {
    this.items = items;
    this.fuse = new Fuse(items, DEFAULT_FUSE_OPTIONS);
  }

  /**
   * Update the search index with new items
   */
  setItems(items: SearchableItem[]): void {
    this.items = items;
    this.fuse = new Fuse(items, DEFAULT_FUSE_OPTIONS);
  }

  /**
   * Get current indexed items
   */
  getItems(): SearchableItem[] {
    return this.items;
  }

  /**
   * Execute a search query
   * @param query - Search query string
   * @param options - Optional search configuration
   * @returns Array of search results sorted by relevance
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const limit = options?.limit ?? 10;

    // Execute Fuse.js search
    const fuseResults = this.fuse.search(query, { limit });

    // Convert to our format
    return fuseResults.map(convertFuseResult);
  }

  /**
   * Get the total number of indexed items
   */
  get size(): number {
    return this.items.length;
  }
}

/**
 * Create a new search engine instance
 */
export function createSearchEngine(items?: SearchableItem[]): SearchEngine {
  return new SearchEngine(items);
}
