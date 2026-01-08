/**
 * Types for Markdown import functionality
 *
 * Defines structures for parsing Markdown files with YAML frontmatter
 * and converting them to BlockNote format for Skelenote.
 */

import type { BlockNoteBlock, BlockNoteInlineContent } from '../export/types';
import type { PropertyValue } from '../types';

/**
 * Result of parsing YAML frontmatter from a Markdown file
 */
export interface FrontmatterResult {
  /** Parsed frontmatter properties */
  properties: Record<string, FrontmatterValue>;
  /** Markdown content after frontmatter */
  content: string;
  /** Whether frontmatter was present */
  hasFrontmatter: boolean;
}

/**
 * Supported frontmatter value types
 */
export type FrontmatterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | null;

/**
 * Wiki-link match found in content
 */
export interface WikiLink {
  /** Full match including brackets [[link]] */
  fullMatch: string;
  /** Link target (text inside brackets) */
  target: string;
  /** Display text if different from target (for [[target|display]]) */
  displayText?: string;
  /** Start index in original string */
  startIndex: number;
  /** End index in original string */
  endIndex: number;
}

/**
 * Result of converting Markdown to BlockNote format
 */
export interface MarkdownToBlockNoteResult {
  /** BlockNote blocks array */
  blocks: BlockNoteBlock[];
  /** Wiki-links found in content (for mention resolution) */
  wikiLinks: WikiLink[];
  /** Errors encountered during conversion */
  errors: string[];
}

/**
 * Full import result combining frontmatter and content
 */
export interface MarkdownImportResult {
  /** Title extracted from frontmatter or first H1 */
  title: string;
  /** Detected Skelenote type ID based on frontmatter */
  typeId: string | null;
  /** Properties extracted from frontmatter */
  properties: Record<string, PropertyValue>;
  /** BlockNote content blocks */
  blocks: BlockNoteBlock[];
  /** Wiki-links for relation resolution */
  wikiLinks: WikiLink[];
  /** Raw markdown content (for fallback) */
  rawContent: string;
  /** Parsing errors */
  errors: string[];
}

/**
 * Options for Markdown import
 */
export interface MarkdownImportOptions {
  /** Default type to use if not specified in frontmatter */
  defaultTypeId?: string;
  /** Function to resolve wiki-link targets to object IDs */
  resolveWikiLink?: (target: string) => string | null;
  /** Whether to extract first H1 as title if not in frontmatter */
  extractTitleFromH1?: boolean;
  /** File path for folder structure mapping */
  filePath?: string;
}

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: Required<
  Omit<MarkdownImportOptions, 'resolveWikiLink' | 'filePath'>
> = {
  defaultTypeId: 'built-in:note',
  extractTitleFromH1: true,
};

/**
 * Folder mapping result for import organization
 */
export interface FolderMapping {
  /** Suggested project name based on folder */
  projectName?: string;
  /** Suggested area name based on parent folder */
  areaName?: string;
  /** Tags derived from folder path */
  folderTags: string[];
}

/**
 * Supported inline content types for import
 */
export type ImportInlineType = 'text' | 'link' | 'mention';

/**
 * Re-export BlockNote types for convenience
 */
export type { BlockNoteBlock, BlockNoteInlineContent };
