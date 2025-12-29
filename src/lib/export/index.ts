/**
 * Markdown export orchestrator
 *
 * Combines frontmatter generation and content conversion,
 * then handles file saving via Tauri dialog.
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import JSZip from 'jszip';
import type { SkelenoteObject, TypeDefinition, TypeRegistry } from '../types';
import type { ExportOptions, ExportContext } from './types';
import { DEFAULT_EXPORT_OPTIONS } from './types';
import { generateFrontmatter } from './frontmatter';
import { convertBlockNoteToMarkdown } from './markdown';

export * from './types';
export { generateFrontmatter, generateFrontmatterProperties, renderFrontmatter } from './frontmatter';
export { convertBlockNoteToMarkdown } from './markdown';

/**
 * Sanitize a title for use as a filename
 * Removes/replaces characters that are invalid in filenames
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
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
 * Generate complete Markdown content for an object
 */
export function generateMarkdownContent(
  object: SkelenoteObject,
  typeDef: TypeDefinition,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): string {
  const context: ExportContext = {
    object,
    typeDef,
    resolveObjectName,
  };

  const parts: string[] = [];

  // Add frontmatter
  if (options.includeFrontmatter) {
    parts.push(generateFrontmatter(context));
    parts.push(''); // Empty line after frontmatter
  }

  // Add title as H1
  if (options.includeTitle) {
    const title = getObjectTitle(object);
    parts.push(`# ${title}`);
    parts.push(''); // Empty line after title
  }

  // Convert and add content
  if (content) {
    const { markdown } = convertBlockNoteToMarkdown(content, resolveObjectName);
    if (markdown) {
      parts.push(markdown);
    }
  }

  return parts.join('\n');
}

/**
 * Export an object to a Markdown file
 *
 * Opens a native save dialog and writes the file.
 * Returns the path where the file was saved, or null if cancelled.
 */
export async function exportObjectToMarkdown(
  object: SkelenoteObject,
  typeDef: TypeDefinition,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<string | null> {
  // Generate the Markdown content
  const markdown = generateMarkdownContent(
    object,
    typeDef,
    content,
    resolveObjectName,
    options
  );

  // Generate default filename
  const title = getObjectTitle(object);
  const defaultFilename = `${sanitizeFilename(title)}.md`;

  // Open save dialog
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [
      {
        name: 'Markdown',
        extensions: ['md'],
      },
    ],
  });

  if (!filePath) {
    // User cancelled
    return null;
  }

  // Ensure .md extension
  const finalPath = filePath.endsWith('.md') ? filePath : `${filePath}.md`;

  // Write the file
  await writeTextFile(finalPath, markdown);

  return finalPath;
}

/**
 * Copy object content as Markdown to clipboard
 * (For future use - clipboard feature)
 */
export function copyObjectAsMarkdown(
  object: SkelenoteObject,
  typeDef: TypeDefinition,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): string {
  return generateMarkdownContent(object, typeDef, content, resolveObjectName, options);
}

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
 * Options for bulk export
 */
export interface BulkExportOptions extends Partial<ExportOptions> {
  /** Filter by type IDs (empty = all types) */
  typeIds?: string[];
  /** Organize files into folders by type */
  organizeByType?: boolean;
}

const DEFAULT_BULK_OPTIONS: BulkExportOptions = {
  ...DEFAULT_EXPORT_OPTIONS,
  typeIds: [],
  organizeByType: true,
};

/**
 * Export all objects to a ZIP file containing Markdown files
 *
 * @param objects - All objects to consider for export
 * @param typeRegistry - Type registry for resolving type definitions
 * @param getContent - Function to get content for an object
 * @param resolveObjectName - Function to resolve object IDs to names
 * @param options - Export options
 * @param onProgress - Progress callback
 * @returns Path where the ZIP was saved, or null if cancelled
 */
export async function exportAllToZip(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: BulkExportOptions = DEFAULT_BULK_OPTIONS,
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  const mergedOptions = { ...DEFAULT_BULK_OPTIONS, ...options };

  // Filter objects by type if specified
  let filteredObjects = objects;
  if (mergedOptions.typeIds && mergedOptions.typeIds.length > 0) {
    filteredObjects = objects.filter((obj) =>
      mergedOptions.typeIds!.includes(obj.typeId)
    );
  }

  // Filter out objects without content support or that are system objects
  filteredObjects = filteredObjects.filter((obj) => {
    const typeDef = typeRegistry.get(obj.typeId);
    return typeDef && !obj.properties.isDailyNote;
  });

  if (filteredObjects.length === 0) {
    throw new Error('No objects to export');
  }

  const total = filteredObjects.length;

  onProgress?.({
    current: 0,
    total,
    phase: 'preparing',
  });

  const zip = new JSZip();
  const usedFilenames = new Map<string, number>();

  // Process each object
  for (let i = 0; i < filteredObjects.length; i++) {
    const obj = filteredObjects[i];
    const typeDef = typeRegistry.get(obj.typeId);

    if (!typeDef) continue;

    const title = getObjectTitle(obj);

    onProgress?.({
      current: i,
      total,
      currentObject: title,
      phase: 'exporting',
    });

    // Get content
    const content = getContent(obj.id);

    // Generate markdown - ensure export options are complete
    const exportOptions: ExportOptions = {
      includeFrontmatter: mergedOptions.includeFrontmatter ?? true,
      includeTitle: mergedOptions.includeTitle ?? true,
    };
    const markdown = generateMarkdownContent(
      obj,
      typeDef,
      content,
      resolveObjectName,
      exportOptions
    );

    // Generate unique filename
    let baseFilename = sanitizeFilename(title) || 'untitled';
    const count = usedFilenames.get(baseFilename) || 0;
    usedFilenames.set(baseFilename, count + 1);

    const filename = count > 0 ? `${baseFilename}-${count}.md` : `${baseFilename}.md`;

    // Determine folder path
    let filePath = filename;
    if (mergedOptions.organizeByType) {
      const folderName = typeDef.name.toLowerCase() + 's';
      filePath = `${folderName}/${filename}`;
    }

    // Add to zip
    zip.file(filePath, markdown);
  }

  onProgress?.({
    current: total,
    total,
    phase: 'compressing',
  });

  // Generate zip file
  const zipBlob = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Generate default filename with date
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `skelenote-export-${date}.zip`;

  // Open save dialog
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [
      {
        name: 'ZIP Archive',
        extensions: ['zip'],
      },
    ],
  });

  if (!filePath) {
    return null;
  }

  // Ensure .zip extension
  const finalPath = filePath.endsWith('.zip') ? filePath : `${filePath}.zip`;

  // Write the file
  await writeFile(finalPath, zipBlob);

  onProgress?.({
    current: total,
    total,
    phase: 'complete',
  });

  return finalPath;
}
