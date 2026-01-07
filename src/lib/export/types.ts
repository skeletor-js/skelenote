/**
 * Types for Markdown export functionality
 */

import type {
  SkelenoteObject,
  TypeDefinition,
  PropertyDefinition,
} from '../types';

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

/**
 * Export format type
 * Extensible for future formats: html, json, plaintext
 */
export type ExportFormat = 'markdown' | 'pdf' | 'html' | 'json' | 'plaintext';

/**
 * Currently implemented export formats
 */
export const IMPLEMENTED_FORMATS: ExportFormat[] = ['markdown', 'pdf'];

/**
 * Export format metadata
 */
export interface ExportFormatInfo {
  value: ExportFormat;
  label: string;
  icon: string;
  description: string;
  implemented: boolean;
}

/**
 * All export formats with metadata
 */
export const EXPORT_FORMATS: ExportFormatInfo[] = [
  {
    value: 'markdown',
    label: 'Markdown',
    icon: 'file-text',
    description: 'Standard .md format with wiki-links',
    implemented: true,
  },
  {
    value: 'pdf',
    label: 'PDF',
    icon: 'file',
    description: 'Styled document with Skelenote typography',
    implemented: true,
  },
  {
    value: 'html',
    label: 'HTML',
    icon: 'code',
    description: 'Web-ready HTML document',
    implemented: false,
  },
  {
    value: 'json',
    label: 'JSON',
    icon: 'braces',
    description: 'Raw BlockNote JSON structure',
    implemented: false,
  },
  {
    value: 'plaintext',
    label: 'Plain Text',
    icon: 'file-type',
    description: 'Simple text without formatting',
    implemented: false,
  },
];

/**
 * PDF-specific export options
 */
export interface PDFExportOptions {
  /** Theme for PDF styling */
  theme: 'light' | 'dark';
  /** Include the title at the top of the PDF */
  includeTitle: boolean;
  /** Include metadata (dates, type) in PDF */
  includeMetadata: boolean;
  /** Page size */
  pageSize?: 'A4' | 'LETTER';
}

/**
 * Default PDF export options
 */
export const DEFAULT_PDF_EXPORT_OPTIONS: PDFExportOptions = {
  theme: 'light',
  includeTitle: true,
  includeMetadata: false,
  pageSize: 'A4',
};

/**
 * Combined export options for the export modal
 */
export interface CombinedExportOptions {
  format: ExportFormat;
  /** Markdown-specific: include YAML frontmatter */
  includeFrontmatter: boolean;
  /** Include title in export */
  includeTitle: boolean;
  /** PDF-specific: theme */
  pdfTheme: 'light' | 'dark';
  /** PDF-specific: page size */
  pageSize: 'A4' | 'LETTER';
}
