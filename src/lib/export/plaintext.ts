/**
 * Plain Text export
 *
 * Converts BlockNote content to simple plain text format,
 * preserving structure through indentation and text markers.
 * Mentions are rendered as @Name.
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import JSZip from 'jszip';
import type { SkelenoteObject, TypeDefinition, TypeRegistry } from '../types';
import type { BlockNoteBlock, BlockNoteInlineContent } from './types';

/**
 * Progress callback for bulk export
 */
export interface BulkExportProgress {
  current: number;
  total: number;
  currentObject?: string;
  phase: 'preparing' | 'exporting' | 'compressing' | 'complete';
}

/**
 * Plain text export options
 */
export interface PlainTextExportOptions {
  /** Include the title at the top */
  includeTitle: boolean;
  /** Style for list bullets */
  listStyle: 'dash' | 'asterisk' | 'number';
}

/**
 * Default plain text export options
 */
export const DEFAULT_PLAINTEXT_OPTIONS: PlainTextExportOptions = {
  includeTitle: true,
  listStyle: 'dash',
};

/**
 * Plain text conversion result
 */
export interface PlainTextConversionResult {
  /** The converted plain text */
  text: string;
  /** Object IDs mentioned in content */
  mentionedObjectIds: string[];
}

/**
 * Context for conversion
 */
interface ConversionContext {
  resolveObjectName: (objectId: string) => string | undefined;
  mentionedObjectIds: Set<string>;
  options: PlainTextExportOptions;
  listCounter: number;
}

/**
 * Get the bullet character based on options
 */
function getBullet(options: PlainTextExportOptions): string {
  switch (options.listStyle) {
    case 'asterisk':
      return '*';
    case 'number':
      return '1.';
    case 'dash':
    default:
      return '-';
  }
}

/**
 * Convert inline content to plain text
 */
function convertInlineContent(
  inline: BlockNoteInlineContent,
  context: ConversionContext
): string {
  switch (inline.type) {
    case 'text':
      return inline.text || '';

    case 'link': {
      const linkText =
        inline.content?.map((c) => convertInlineContent(c, context)).join('') ||
        inline.text ||
        '';
      const url = inline.props?.href || inline.props?.url || '';
      // Include URL in parentheses for reference
      return url ? `${linkText} (${url})` : linkText;
    }

    case 'mention': {
      const objectId = inline.props?.objectId as string;
      const objectName = inline.props?.objectName as string;

      if (objectId) {
        context.mentionedObjectIds.add(objectId);
        const resolvedName =
          context.resolveObjectName(objectId) || objectName || 'Unknown';
        return `@${resolvedName}`;
      }
      return `@${objectName || 'Unknown'}`;
    }

    default:
      if (inline.text) return inline.text;
      if (inline.content) {
        return inline.content
          .map((c) => convertInlineContent(c, context))
          .join('');
      }
      return '';
  }
}

/**
 * Convert an array of inline content to string
 */
function convertInlineArray(
  content: BlockNoteInlineContent[] | undefined,
  context: ConversionContext
): string {
  if (!content || !Array.isArray(content)) return '';
  return content.map((c) => convertInlineContent(c, context)).join('');
}

/**
 * Convert a paragraph block
 */
function convertParagraph(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  return convertInlineArray(block.content as BlockNoteInlineContent[], context);
}

/**
 * Convert a heading block
 */
function convertHeading(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const level = (block.props?.level as number) || 1;

  // Use markdown-style headings for readability
  const prefix = '#'.repeat(Math.min(level, 6));
  return `${prefix} ${content}`;
}

/**
 * Convert a bullet list item
 */
function convertBulletListItem(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const bullet = getBullet(context.options);
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const lines = [`${indent}${bullet} ${content}`];

  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      lines.push(convertBlock(child, context, depth + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Convert a numbered list item
 */
function convertNumberedListItem(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const lines = [`${indent}1. ${content}`];

  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      lines.push(convertBlock(child, context, depth + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Convert a checklist item
 */
function convertCheckListItem(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const indent = '  '.repeat(depth);
  const checked = block.props?.checked ? 'x' : ' ';
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const lines = [`${indent}[${checked}] ${content}`];

  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      lines.push(convertBlock(child, context, depth + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Convert a code block
 */
function convertCodeBlock(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  // Indent code blocks for visual distinction
  const indented = content
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return indented;
}

/**
 * Convert a blockquote
 */
function convertBlockquote(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number
): string {
  const content = convertInlineArray(
    block.content as BlockNoteInlineContent[],
    context
  );
  const lines = [`> ${content}`];

  if (block.children && block.children.length > 0) {
    for (const child of block.children) {
      const childText = convertBlock(child, context, depth);
      lines.push(
        childText
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')
      );
    }
  }

  return lines.join('\n');
}

/**
 * Convert a table to plain text
 */
function convertTable(
  block: BlockNoteBlock,
  context: ConversionContext
): string {
  const content = block.content as BlockNoteBlock[];
  if (!content || content.length === 0) return '';

  const rows: string[][] = [];

  for (const row of content) {
    if (row.type === 'tableRow' && row.content) {
      const cells: string[] = [];
      for (const cell of row.content as BlockNoteBlock[]) {
        if (cell.type === 'tableCell' && cell.content) {
          cells.push(
            convertInlineArray(
              cell.content as BlockNoteInlineContent[],
              context
            )
          );
        }
      }
      rows.push(cells);
    }
  }

  if (rows.length === 0) return '';

  // Simple tab-separated format
  return rows.map((row) => row.join('\t')).join('\n');
}

/**
 * Convert an image block
 */
function convertImage(block: BlockNoteBlock): string {
  const caption = (block.props?.caption as string) || '';
  const name = (block.props?.name as string) || 'image';
  return `[Image: ${caption || name}]`;
}

/**
 * Convert a single block to plain text
 */
function convertBlock(
  block: BlockNoteBlock,
  context: ConversionContext,
  depth: number = 0
): string {
  switch (block.type) {
    case 'paragraph':
      return convertParagraph(block, context);

    case 'heading':
      return convertHeading(block, context);

    case 'bulletListItem':
      return convertBulletListItem(block, context, depth);

    case 'numberedListItem':
      return convertNumberedListItem(block, context, depth);

    case 'checkListItem':
      return convertCheckListItem(block, context, depth);

    case 'codeBlock':
      return convertCodeBlock(block, context);

    case 'blockquote':
      return convertBlockquote(block, context, depth);

    case 'table':
      return convertTable(block, context);

    case 'image':
      return convertImage(block);

    default:
      if (block.content && Array.isArray(block.content)) {
        return convertInlineArray(
          block.content as BlockNoteInlineContent[],
          context
        );
      }
      return '';
  }
}

/**
 * Convert BlockNote JSON content to plain text
 */
export function convertBlockNoteToPlainText(
  contentJson: string | BlockNoteBlock[],
  resolveObjectName: (objectId: string) => string | undefined,
  options: PlainTextExportOptions = DEFAULT_PLAINTEXT_OPTIONS
): PlainTextConversionResult {
  const context: ConversionContext = {
    resolveObjectName,
    mentionedObjectIds: new Set(),
    options,
    listCounter: 1,
  };

  let blocks: BlockNoteBlock[];
  try {
    blocks =
      typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
  } catch {
    return { text: '', mentionedObjectIds: [] };
  }

  if (!Array.isArray(blocks)) {
    return { text: '', mentionedObjectIds: [] };
  }

  const textLines: string[] = [];
  for (const block of blocks) {
    const text = convertBlock(block, context);
    if (text) {
      textLines.push(text);
    }
  }

  return {
    text: textLines.join('\n\n'),
    mentionedObjectIds: Array.from(context.mentionedObjectIds),
  };
}

/**
 * Sanitize a title for use as a filename
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
    .toLowerCase();
}

/**
 * Get the title from an object
 */
function getObjectTitle(object: SkelenoteObject): string {
  const title = object.properties.title ?? object.properties.name;
  return title ? String(title) : 'Untitled';
}

/**
 * Generate complete plain text content for an object
 */
export function generatePlainTextContent(
  object: SkelenoteObject,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: PlainTextExportOptions = DEFAULT_PLAINTEXT_OPTIONS
): string {
  const parts: string[] = [];

  if (options.includeTitle) {
    const title = getObjectTitle(object);
    parts.push(title);
    parts.push('='.repeat(title.length));
    parts.push('');
  }

  if (content) {
    const { text } = convertBlockNoteToPlainText(
      content,
      resolveObjectName,
      options
    );
    if (text) {
      parts.push(text);
    }
  }

  return parts.join('\n');
}

/**
 * Export a single object to a plain text file
 */
export async function exportObjectToPlainText(
  object: SkelenoteObject,
  _typeDef: TypeDefinition,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: PlainTextExportOptions = DEFAULT_PLAINTEXT_OPTIONS
): Promise<string | null> {
  const text = generatePlainTextContent(
    object,
    content,
    resolveObjectName,
    options
  );

  const title = getObjectTitle(object);
  const defaultFilename = `${sanitizeFilename(title)}.txt`;

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'Plain Text', extensions: ['txt'] }],
  });

  if (!filePath) return null;

  const finalPath = filePath.endsWith('.txt') ? filePath : `${filePath}.txt`;
  await writeTextFile(finalPath, text);

  return finalPath;
}

/**
 * Options for bulk plain text export
 */
export interface PlainTextBulkExportOptions extends Partial<PlainTextExportOptions> {
  typeIds?: string[];
  organizeByType?: boolean;
}

/**
 * Export all objects to a ZIP containing plain text files
 */
export async function exportAllToPlainTextZip(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: PlainTextBulkExportOptions = {},
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  const mergedOptions: PlainTextExportOptions & PlainTextBulkExportOptions = {
    ...DEFAULT_PLAINTEXT_OPTIONS,
    organizeByType: true,
    ...options,
  };

  let filteredObjects = objects;
  if (mergedOptions.typeIds && mergedOptions.typeIds.length > 0) {
    filteredObjects = objects.filter((obj) =>
      mergedOptions.typeIds!.includes(obj.typeId)
    );
  }

  filteredObjects = filteredObjects.filter((obj) => typeRegistry.get(obj.typeId));

  if (filteredObjects.length === 0) {
    throw new Error('No objects to export');
  }

  const total = filteredObjects.length;
  onProgress?.({ current: 0, total, phase: 'preparing' });

  const zip = new JSZip();
  const usedFilenames = new Map<string, number>();

  for (let i = 0; i < filteredObjects.length; i++) {
    const obj = filteredObjects[i];
    const typeDef = typeRegistry.get(obj.typeId);
    if (!typeDef) continue;

    const title = getObjectTitle(obj);
    onProgress?.({ current: i, total, currentObject: title, phase: 'exporting' });

    const content = getContent(obj.id);
    const text = generatePlainTextContent(obj, content, resolveObjectName, {
      includeTitle: mergedOptions.includeTitle ?? true,
      listStyle: mergedOptions.listStyle ?? 'dash',
    });

    const baseFilename = sanitizeFilename(title) || 'untitled';
    const count = usedFilenames.get(baseFilename) || 0;
    usedFilenames.set(baseFilename, count + 1);

    const filename =
      count > 0 ? `${baseFilename}-${count}.txt` : `${baseFilename}.txt`;

    let filePath = filename;
    if (mergedOptions.organizeByType) {
      const isDaily = obj.typeId === 'note' && obj.properties.isDailyNote;
      const folderName = isDaily
        ? 'daily-notes'
        : typeDef.name.toLowerCase() + 's';
      filePath = `${folderName}/${filename}`;
    }

    zip.file(filePath, text);
  }

  onProgress?.({ current: total, total, phase: 'compressing' });

  const zipBlob = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `skelenote-plaintext-${date}.zip`;

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });

  if (!filePath) return null;

  const finalPath = filePath.endsWith('.zip') ? filePath : `${filePath}.zip`;
  await writeFile(finalPath, zipBlob);

  onProgress?.({ current: total, total, phase: 'complete' });

  return finalPath;
}
