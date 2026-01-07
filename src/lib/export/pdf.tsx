/**
 * PDF Export Module
 *
 * Main entry point for PDF export functionality.
 * Uses lazy loading to minimize bundle impact.
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import JSZip from 'jszip';
import type { SkelenoteObject, TypeDefinition, TypeRegistry } from '../types';
import type { BlockNoteBlock } from './types';
import type { BulkExportProgress, BulkExportOptions } from './index';
import { processImagesInContent } from './image-utils';
import { type PDFTheme, type PageSize, pageConfig } from './pdf-theme';

/**
 * PDF export options
 */
export interface PDFExportOptions {
  /** Theme for PDF (light or dark) */
  theme: PDFTheme;
  /** Include the object title at the top */
  includeTitle: boolean;
  /** Include metadata (type, dates) in footer */
  includeMetadata: boolean;
  /** Page size */
  pageSize: PageSize;
}

/**
 * Default PDF export options
 */
export const DEFAULT_PDF_OPTIONS: PDFExportOptions = {
  theme: 'light',
  includeTitle: true,
  includeMetadata: false,
  pageSize: 'A4',
};

/**
 * Lazy load react-pdf/renderer to minimize initial bundle
 */
async function loadReactPDF() {
  const { Document, Page, pdf } = await import('@react-pdf/renderer');
  const { PDFContent, getThemeColors } = await import('./pdf-components');
  return { Document, Page, pdf, PDFContent, getThemeColors };
}

/**
 * Get the title from an object
 */
function getObjectTitle(object: SkelenoteObject): string {
  const title = object.properties.title ?? object.properties.name;
  return title ? String(title) : 'Untitled';
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
 * Parse BlockNote content JSON
 */
function parseContent(contentJson: string): BlockNoteBlock[] {
  if (!contentJson) return [];

  try {
    const parsed = JSON.parse(contentJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Generate PDF blob for a single object
 */
export async function generatePDFBlob(
  object: SkelenoteObject,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: PDFExportOptions = DEFAULT_PDF_OPTIONS
): Promise<Uint8Array> {
  // Load react-pdf lazily
  const { Document, Page, pdf, PDFContent, getThemeColors } =
    await loadReactPDF();

  // Parse and process content
  let blocks = parseContent(content);

  // Process images to convert URLs to base64
  blocks = await processImagesInContent(blocks);

  // Get theme colors and page config
  const colors = getThemeColors(options.theme);
  const page = pageConfig[options.pageSize];
  const title = options.includeTitle ? getObjectTitle(object) : undefined;

  // Create PDF document
  const doc = (
    <Document>
      <Page
        size={page.size}
        style={{
          paddingTop: page.margin.top,
          paddingRight: page.margin.right,
          paddingBottom: page.margin.bottom,
          paddingLeft: page.margin.left,
          backgroundColor: colors.background,
        }}
      >
        <PDFContent
          blocks={blocks}
          theme={options.theme}
          resolveObjectName={resolveObjectName}
          title={title}
        />
      </Page>
    </Document>
  );

  // Generate PDF blob
  const pdfBlob = await pdf(doc).toBlob();

  // Convert Blob to Uint8Array
  const arrayBuffer = await pdfBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Export a single object to PDF
 *
 * Opens a native save dialog and writes the file.
 * Returns the path where the file was saved, or null if cancelled.
 */
export async function exportObjectToPDF(
  object: SkelenoteObject,
  _typeDef: TypeDefinition,
  content: string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: PDFExportOptions = DEFAULT_PDF_OPTIONS
): Promise<string | null> {
  // Generate PDF blob
  const pdfData = await generatePDFBlob(
    object,
    content,
    resolveObjectName,
    options
  );

  // Generate default filename
  const title = getObjectTitle(object);
  const defaultFilename = `${sanitizeFilename(title)}.pdf`;

  // Open save dialog
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [
      {
        name: 'PDF Document',
        extensions: ['pdf'],
      },
    ],
  });

  if (!filePath) {
    return null;
  }

  // Ensure .pdf extension
  const finalPath = filePath.endsWith('.pdf') ? filePath : `${filePath}.pdf`;

  // Write the file
  await writeFile(finalPath, pdfData);

  return finalPath;
}

/**
 * PDF-specific bulk export options
 */
export interface PDFBulkExportOptions extends Partial<BulkExportOptions> {
  /** PDF theme */
  pdfTheme: PDFTheme;
  /** Page size */
  pageSize?: PageSize;
}

const DEFAULT_PDF_BULK_OPTIONS: PDFBulkExportOptions = {
  pdfTheme: 'light',
  pageSize: 'A4',
  organizeByType: true,
};

/**
 * Export all objects to a ZIP file containing PDF files
 *
 * @param objects - All objects to export
 * @param typeRegistry - Type registry for resolving type definitions
 * @param getContent - Function to get content for an object
 * @param resolveObjectName - Function to resolve object IDs to names
 * @param options - Export options
 * @param onProgress - Progress callback
 * @returns Path where the ZIP was saved, or null if cancelled
 */
export async function exportAllToPDFZip(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  resolveObjectName: (objectId: string) => string | undefined,
  options: PDFBulkExportOptions = DEFAULT_PDF_BULK_OPTIONS,
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  const mergedOptions = { ...DEFAULT_PDF_BULK_OPTIONS, ...options };

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

  // PDF export options
  const pdfOptions: PDFExportOptions = {
    theme: mergedOptions.pdfTheme,
    includeTitle: mergedOptions.includeTitle ?? true,
    includeMetadata: false,
    pageSize: mergedOptions.pageSize ?? 'A4',
  };

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

    // Generate PDF blob
    const pdfData = await generatePDFBlob(
      obj,
      content,
      resolveObjectName,
      pdfOptions
    );

    // Generate unique filename
    const baseFilename = sanitizeFilename(title) || 'untitled';
    const count = usedFilenames.get(baseFilename) || 0;
    usedFilenames.set(baseFilename, count + 1);

    const filename =
      count > 0 ? `${baseFilename}-${count}.pdf` : `${baseFilename}.pdf`;

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
    zip.file(filePath, pdfData);
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
  const defaultFilename = `skelenote-pdf-export-${date}.zip`;

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
