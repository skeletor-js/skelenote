/**
 * Search library exports
 * Full-text search across objects, properties, and content
 */

// Types
export type {
  SearchableItem,
  SearchMatch,
  SearchResult,
  SearchOptions,
} from './types';

// Plain text extraction
export {
  extractPlainTextFromBlocks,
  extractPlainTextFromContent,
} from './extract';

// Index building
export {
  buildSearchIndex,
  buildSearchableItemForObject,
} from './indexer';

// Search engine
export {
  SearchEngine,
  createSearchEngine,
} from './query';

// Highlighting
export type { TextSegment } from './highlight';
export {
  highlightText,
  createSnippet,
  getBestSnippet,
} from './highlight';
