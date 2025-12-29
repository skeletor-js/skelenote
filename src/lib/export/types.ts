/**
 * Types for Markdown export functionality
 */

import type { SkelenoteObject, TypeDefinition, PropertyDefinition } from '../types';

/**
 * Options for exporting an object to Markdown
 */
export interface ExportOptions {
  /** Include YAML frontmatter with properties */
  includeFrontmatter: boolean;
  /** Include the title as an H1 heading in content */
  includeTitle: boolean;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeFrontmatter: true,
  includeTitle: true,
};

/**
 * Result of converting BlockNote content to Markdown
 */
export interface MarkdownConversionResult {
  /** The converted Markdown string */
  markdown: string;
  /** Object IDs that were mentioned in the content */
  mentionedObjectIds: string[];
}

/**
 * Context passed to the export functions
 */
export interface ExportContext {
  /** The object being exported */
  object: SkelenoteObject;
  /** The type definition for the object */
  typeDef: TypeDefinition;
  /** Function to resolve object ID to name */
  resolveObjectName: (objectId: string) => string | undefined;
}

/**
 * Frontmatter property with resolved value
 */
export interface FrontmatterProperty {
  /** Property key (from definition name, kebab-cased) */
  key: string;
  /** Resolved value for YAML output */
  value: string | number | boolean | string[] | null;
  /** Original property definition */
  definition: PropertyDefinition;
}

/**
 * BlockNote block structure (simplified for export)
 */
export interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInlineContent[] | BlockNoteBlock[];
  children?: BlockNoteBlock[];
}

/**
 * BlockNote inline content structure
 */
export interface BlockNoteInlineContent {
  type: string;
  text?: string;
  props?: Record<string, unknown>;
  styles?: Record<string, boolean | string>;
  content?: BlockNoteInlineContent[];
}

/**
 * Supported BlockNote block types for conversion
 */
export type SupportedBlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletListItem'
  | 'numberedListItem'
  | 'checkListItem'
  | 'codeBlock'
  | 'blockquote'
  | 'table'
  | 'image';

/**
 * Supported inline content types
 */
export type SupportedInlineType = 'text' | 'link' | 'mention';
