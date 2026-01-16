/**
 * Markdown export orchestrator
 *
 * Combines frontmatter generation and content conversion,
 * then handles file saving via Tauri dialog.
 */

import { save } from '@tauri-apps/plugin-dialog';
import {
  writeTextFile,
  writeFile,
  readFile,
  mkdir,
  copyFile,
} from '@tauri-apps/plugin-fs';
import { join, dirname } from '@tauri-apps/api/path';
import JSZip from 'jszip';
import type { SkelenoteObject, TypeDefinition, TypeRegistry } from '../types';
import type { ExportOptions, ExportContext, BlockNoteBlock } from './types';
import { DEFAULT_EXPORT_OPTIONS } from './types';
import { generateFrontmatter } from './frontmatter';
import {
  convertBlockNoteToMarkdown,
  extractFileUrls,
  extractFilePathFromUrl,
  rewriteFileUrls,
} from './markdown';

export * from './types';
export {
  generateFrontmatter,
  generateFrontmatterProperties,
  renderFrontmatter,
} from './frontmatter';
export {
  convertBlockNoteToMarkdown,
  extractFileUrls,
  extractFilePathFromUrl,
  rewriteFileUrls,
} from './markdown';

// PDF exports - lazy loaded
export { exportObjectToPDF, exportAllToPDFZip } from './pdf';
export type {
  PDFExportOptions as PDFModuleOptions,
  PDFBulkExportOptions,
} from './pdf';
export * from './pdf-theme';

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
 * If the content contains local file attachments (file:// URLs),
 * creates an attachments folder alongside the markdown file.
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
  let markdown = generateMarkdownContent(
    object,
    typeDef,
    content,
    resolveObjectName,
    options
  );

  // Extract file:// URLs to check for local attachments
  let blocks: BlockNoteBlock[] = [];
  try {
    blocks = content ? JSON.parse(content) : [];
  } catch {
    blocks = [];
  }
  const fileUrls = extractFileUrls(blocks);

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

  // If there are local attachments, copy them alongside the markdown
  if (fileUrls.length > 0) {
    const urlMap = new Map<string, string>();
    const exportDir = await dirname(finalPath);
    const attachmentsDir = await join(exportDir, 'attachments');

    // Create attachments directory
    try {
      await mkdir(attachmentsDir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Copy each attachment
    for (const fileUrl of fileUrls) {
      const srcPath = extractFilePathFromUrl(fileUrl);
      if (!srcPath) {
        console.warn(`Could not extract file path from URL: ${fileUrl}`);
        continue;
      }
      const filename = srcPath.split('/').pop() || 'attachment';

      try {
        const destPath = await join(attachmentsDir, filename);
        await copyFile(srcPath, destPath);
        urlMap.set(fileUrl, `./attachments/${filename}`);
      } catch (error) {
        console.warn(`Failed to copy attachment: ${srcPath}`, error);
        // Keep original URL if copy fails
      }
    }

    // Rewrite URLs in markdown
    markdown = rewriteFileUrls(markdown, urlMap);
  }

  // Write the file
  await writeTextFile(finalPath, markdown);

  return finalPath;
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

  // Filter out objects without type definitions
  filteredObjects = filteredObjects.filter((obj) => {
    const typeDef = typeRegistry.get(obj.typeId);
    return typeDef;
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
  const addedAttachments = new Set<string>(); // Track added attachments to avoid duplicates

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
    let markdown = generateMarkdownContent(
      obj,
      typeDef,
      content,
      resolveObjectName,
      exportOptions
    );

    // Extract and process file:// URLs
    let blocks: BlockNoteBlock[] = [];
    try {
      blocks = content ? JSON.parse(content) : [];
    } catch {
      blocks = [];
    }
    const fileUrls = extractFileUrls(blocks);

    // Process attachments for this object
    if (fileUrls.length > 0) {
      const urlMap = new Map<string, string>();

      for (const fileUrl of fileUrls) {
        const srcPath = extractFilePathFromUrl(fileUrl);
        if (!srcPath) {
          console.warn(`Could not extract file path from URL: ${fileUrl}`);
          continue;
        }
        const filename = srcPath.split('/').pop() || 'attachment';
        const attachmentPath = `attachments/${filename}`;

        // Only add each attachment file once
        if (!addedAttachments.has(attachmentPath)) {
          try {
            const fileData = await readFile(srcPath);
            zip.file(attachmentPath, fileData);
            addedAttachments.add(attachmentPath);
          } catch (error) {
            console.warn(`Failed to read attachment: ${srcPath}`, error);
            // Keep original URL if read fails
            continue;
          }
        }

        urlMap.set(fileUrl, `./${attachmentPath}`);
      }

      // Rewrite URLs in markdown
      markdown = rewriteFileUrls(markdown, urlMap);
    }

    // Generate unique filename
    const baseFilename = sanitizeFilename(title) || 'untitled';
    const count = usedFilenames.get(baseFilename) || 0;
    usedFilenames.set(baseFilename, count + 1);

    const filename =
      count > 0 ? `${baseFilename}-${count}.md` : `${baseFilename}.md`;

    // Determine folder path
    let filePath = filename;
    if (mergedOptions.organizeByType) {
      const isDaily = obj.typeId === 'note' && obj.properties.isDailyNote;
      const folderName = isDaily
        ? 'daily-notes'
        : typeDef.name.toLowerCase() + 's';
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

/**
 * JSON backup format for complete data export
 */
export interface JSONBackup {
  version: number;
  exportedAt: string;
  objects: Array<{
    id: string;
    typeId: string;
    properties: Record<string, unknown>;
    content?: string;
    hasContent: boolean;
    inboxed: boolean;
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  }>;
}

/**
 * Export all objects to a JSON backup file
 *
 * This format is suitable for complete backup and restore operations.
 * All object data including content is preserved.
 *
 * @param objects - All objects to export
 * @param getContent - Function to get content for an object
 * @param onProgress - Progress callback
 * @returns Path where the JSON was saved, or null if cancelled
 */
export async function exportAllToJSON(
  objects: SkelenoteObject[],
  getContent: (objectId: string) => string,
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  if (objects.length === 0) {
    throw new Error('No objects to export');
  }

  const total = objects.length;

  onProgress?.({
    current: 0,
    total,
    phase: 'preparing',
  });

  // Build backup object
  const backup: JSONBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    objects: [],
  };

  // Process each object
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const title = getObjectTitle(obj);

    onProgress?.({
      current: i,
      total,
      currentObject: title,
      phase: 'exporting',
    });

    // Get content if object has it
    let content: string | undefined;
    if (obj.hasContent) {
      try {
        content = getContent(obj.id);
      } catch {
        // Content might not exist or be readable
        content = undefined;
      }
    }

    backup.objects.push({
      id: obj.id,
      typeId: obj.typeId,
      properties: obj.properties,
      content,
      hasContent: obj.hasContent,
      inboxed: obj.inboxed,
      pinned: obj.pinned,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    });
  }

  onProgress?.({
    current: total,
    total,
    phase: 'compressing',
  });

  // Serialize to JSON
  const jsonContent = JSON.stringify(backup, null, 2);
  const jsonData = new TextEncoder().encode(jsonContent);

  // Generate default filename with date
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `skelenote-backup-${date}.json`;

  // Open save dialog
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [
      {
        name: 'JSON Backup',
        extensions: ['json'],
      },
    ],
  });

  if (!filePath) {
    return null;
  }

  // Ensure .json extension
  const finalPath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;

  // Write the file
  await writeFile(finalPath, jsonData);

  onProgress?.({
    current: total,
    total,
    phase: 'complete',
  });

  return finalPath;
}
