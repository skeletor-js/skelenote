/**
 * Markdown import module
 *
 * Provides utilities for converting Markdown files with YAML frontmatter
 * into BlockNote format for Skelenote import.
 *
 * This module is the foundation for all import wizards:
 * - Obsidian
 * - Notion
 * - Apple Notes
 * - Generic Markdown
 */

// Main converter
export {
  importMarkdown,
  importMarkdownFiles,
  parseMarkdownToBlocks,
} from './markdown';

// Frontmatter utilities
export {
  parseFrontmatter,
  mapTypeToSkelenote,
  convertFrontmatterToProperties,
  extractTitle,
  extractFolderMapping,
} from './frontmatter';

// Wiki-link utilities
export {
  extractWikiLinks,
  preprocessWikiLinks,
  convertWikiLinksToMentions,
  createMentionInline,
  hasWikiLinks,
} from './wiki-links';

// Types
export type {
  FrontmatterResult,
  FrontmatterValue,
  WikiLink,
  MarkdownToBlockNoteResult,
  MarkdownImportResult,
  MarkdownImportOptions,
  FolderMapping,
  BlockNoteBlock,
  BlockNoteInlineContent,
} from './types';

export { DEFAULT_IMPORT_OPTIONS } from './types';

// Notion API import (dynamically loaded)
// These are re-exported for convenience, but the modules use dynamic imports internally
export type {
  NotionDatabaseInfo,
  NotionPageInfo,
  DatabasePropertySchema,
  ProgressCallback,
} from './notion-api';

export type {
  SelectedDatabase,
  NotionImportOptions,
  NotionImportProgress,
  NotionImportResult,
} from './notion-import';

export type { TypeInferenceResult } from './notion-type-inference';
