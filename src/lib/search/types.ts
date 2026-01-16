/**
 * Search type definitions
 */

/**
 * An item that can be searched
 * Built from a SkelenoteObject by extracting searchable text
 */
export interface SearchableItem {
  /** Object ID */
  id: string;
  /** Object type ID (task, note, project, etc.) */
  typeId: string;
  /** Object title or name */
  title: string;
  /** Concatenated searchable property values */
  properties: string;
  /** Plain text extracted from BlockNote content */
  content: string;
  /** Object last modified timestamp */
  updatedAt: number;
}

/**
 * A match within a search result
 */
export interface SearchMatch {
  /** Which field was matched */
  key: 'title' | 'properties' | 'content';
  /** The full value of the matched field */
  value: string;
  /** Array of [start, end] indices of matched characters */
  indices: ReadonlyArray<readonly [number, number]>;
}

/**
 * How a result was matched
 */
export type MatchType = 'text' | 'semantic' | 'hybrid';

/**
 * A search result with matching information
 */
export interface SearchResult {
  /** The matched item */
  item: SearchableItem;
  /** Search relevance score (lower is better in Fuse.js, normalized 0-1 for combined) */
  score: number;
  /** Match details for highlighting */
  matches: SearchMatch[];
  /** How this result was matched (text, semantic, or hybrid) */
  matchType?: MatchType;
  /** Semantic similarity score (0-1, only present for semantic/hybrid matches) */
  semanticScore?: number;
}

/**
 * Configuration options for the search engine
 */
export interface SearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Fuzzy matching threshold (0 = exact, 1 = match anything) */
  threshold?: number;
}
