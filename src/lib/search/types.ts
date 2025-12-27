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
 * A search result with matching information
 */
export interface SearchResult {
  /** The matched item */
  item: SearchableItem;
  /** Search relevance score (lower is better in Fuse.js) */
  score: number;
  /** Match details for highlighting */
  matches: SearchMatch[];
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
