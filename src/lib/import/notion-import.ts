/**
 * Notion Import Orchestrator
 *
 * Main entry point for importing data from Notion via API.
 * Coordinates database fetching, property conversion, and object creation.
 */

import type { ObjectStore } from '../loro/objects';
import type {
  NotionClient,
  NotionDatabaseInfo,
  NotionPageInfo,
  NotionBlock,
} from './notion-api';
import type { PropertyValue } from '../types';
import {
  queryDatabase,
  getPageBlocks,
  listStandalonePages,
} from './notion-api';
import { convertNotionBlocks } from './notion-blocks';
import { convertNotionProperties } from './notion-properties';
import { BuiltInTypeIds } from '../types';

/**
 * Selected database for import with type and property mappings
 */
export interface SelectedDatabase {
  database: NotionDatabaseInfo;
  targetTypeId: string;
  selected: boolean;
  /** Optional property mappings (auto-inferred if not provided) */
  propertyMappings?: import('./notion-properties').PropertyMapping[];
}

/**
 * Import options
 */
export interface NotionImportOptions {
  /** Notion API client */
  client: NotionClient;
  /** Skelenote object store */
  store: ObjectStore;
  /** Databases to import with type mappings */
  databases: SelectedDatabase[];
  /** Whether to import standalone pages */
  importStandalonePages: boolean;
  /** Progress callback */
  onProgress?: (progress: NotionImportProgress) => void;
}

/**
 * Import progress state
 */
export interface NotionImportProgress {
  phase: 'fetching' | 'creating-tags' | 'importing' | 'linking' | 'complete';
  currentDatabase?: string;
  currentPage?: string;
  pagesImported: number;
  totalPages: number;
  message: string;
}

/**
 * Import result
 */
export interface NotionImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  /** Mapping from Notion page ID to Skelenote object metadata */
  idMapping: Map<string, { objectId: string; typeId: string; title: string }>;
  /** Created tag IDs */
  createdTags: Map<string, string>;
}

/**
 * Import data from Notion
 */
export async function importFromNotion(
  options: NotionImportOptions
): Promise<NotionImportResult> {
  const { client, store, databases, importStandalonePages, onProgress } =
    options;

  const result: NotionImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
    idMapping: new Map(),
    createdTags: new Map(),
  };

  // Collect all pending tags from all databases first
  const allPendingTags = new Set<string>();

  // Phase 1: Fetch all pages from selected databases
  const allPages: Array<{
    page: NotionPageInfo;
    typeId: string;
    dbName: string;
  }> = [];

  for (const { database, targetTypeId, selected } of databases) {
    if (!selected) continue;

    onProgress?.({
      phase: 'fetching',
      currentDatabase: database.name,
      pagesImported: 0,
      totalPages: 0,
      message: `Fetching pages from ${database.name}...`,
    });

    try {
      const pages = await queryDatabase(
        client,
        database.id,
        (current, total, msg) => {
          onProgress?.({
            phase: 'fetching',
            currentDatabase: database.name,
            pagesImported: current,
            totalPages: total,
            message: msg,
          });
        }
      );

      for (const page of pages) {
        allPages.push({ page, typeId: targetTypeId, dbName: database.name });

        // Pre-scan for tags
        const converted = convertNotionProperties(
          page.properties,
          targetTypeId
        );
        for (const tag of converted.pendingTags) {
          allPendingTags.add(tag);
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to fetch ${database.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Fetch standalone pages if requested
  if (importStandalonePages) {
    onProgress?.({
      phase: 'fetching',
      pagesImported: 0,
      totalPages: 0,
      message: 'Fetching standalone pages...',
    });

    try {
      const standalonePages = await listStandalonePages(
        client,
        (current, total, msg) => {
          onProgress?.({
            phase: 'fetching',
            pagesImported: current,
            totalPages: total,
            message: msg,
          });
        }
      );

      for (const page of standalonePages) {
        allPages.push({
          page,
          typeId: BuiltInTypeIds.NOTE,
          dbName: 'Standalone Pages',
        });
      }
    } catch (error) {
      result.errors.push(
        `Failed to fetch standalone pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Phase 2: Create tags first (so we can link to them)
  if (allPendingTags.size > 0) {
    onProgress?.({
      phase: 'creating-tags',
      pagesImported: 0,
      totalPages: allPendingTags.size,
      message: 'Creating tags...',
    });

    for (const tagName of allPendingTags) {
      try {
        // Check if tag already exists
        const existingTag = store
          .getByType(BuiltInTypeIds.TAG)
          .find((obj) => obj.properties.name === tagName);

        if (existingTag) {
          result.createdTags.set(tagName, existingTag.id);
        } else {
          const tag = store.create({
            typeId: BuiltInTypeIds.TAG,
            properties: { name: tagName },
            inboxed: false, // Tags don't go to inbox
          });
          result.createdTags.set(tagName, tag.id);
        }
      } catch (error) {
        result.errors.push(
          `Failed to create tag "${tagName}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  // Phase 3: Import pages in parallel batches
  let importedCount = 0;
  const totalPages = allPages.length;
  const BATCH_SIZE = 5; // Process 5 pages concurrently

  for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
    const batch = allPages.slice(i, i + BATCH_SIZE);

    onProgress?.({
      phase: 'importing',
      currentDatabase: batch[0]?.dbName,
      currentPage: batch.map((p) => p.page.title).join(', '),
      pagesImported: importedCount,
      totalPages,
      message: `Importing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(allPages.length / BATCH_SIZE)}...`,
    });

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async ({ page, typeId }) => {
        const objectId = await importPage(
          client,
          store,
          page,
          typeId,
          result.createdTags,
          result.idMapping
        );
        return { pageId: page.id, objectId, title: page.title, typeId };
      })
    );

    // Process results
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.idMapping.set(batchResult.value.pageId, {
          objectId: batchResult.value.objectId,
          typeId: batchResult.value.typeId,
          title: batchResult.value.title,
        });
        importedCount++;
        result.imported++;
      } else {
        const error = batchResult.reason;
        result.errors.push(
          `Failed to import page: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        result.skipped++;
      }
    }
  }

  // Phase 4: Resolve relations (second pass)
  onProgress?.({
    phase: 'linking',
    pagesImported: totalPages,
    totalPages,
    message: 'Resolving relations...',
  });

  // For now, we store relations as pending during import
  // A full implementation would do a second pass here to update relation properties
  // But since we're mapping to Notes (which don't have typed relations),
  // we can skip this for the MVP

  // Complete
  onProgress?.({
    phase: 'complete',
    pagesImported: result.imported,
    totalPages,
    message: `Imported ${result.imported} pages`,
  });

  return result;
}

/**
 * Import a single page
 */
async function importPage(
  client: NotionClient,
  store: ObjectStore,
  page: NotionPageInfo,
  typeId: string,
  createdTags: Map<string, string>,
  idMapping: Map<string, { objectId: string; typeId: string; title: string }>
): Promise<string> {
  // Convert properties
  const converted = convertNotionProperties(page.properties, typeId);

  // Build properties with tag relations
  const properties: Record<string, unknown> = { ...converted.properties };

  // Add title if not set
  if (!properties.title && !properties.name) {
    if (typeId === BuiltInTypeIds.PROJECT || typeId === BuiltInTypeIds.AREA) {
      properties.name = page.title;
    } else {
      properties.title = page.title;
    }
  }

  // Resolve tags
  if (converted.pendingTags.length > 0) {
    const tagIds = converted.pendingTags
      .map((tagName) => createdTags.get(tagName))
      .filter((id): id is string => !!id);

    if (tagIds.length > 0) {
      properties.tags = tagIds;
    }
  }

  // Set default status for tasks
  if (typeId === BuiltInTypeIds.TASK && !properties.status) {
    properties.status = 'todo';
  }

  // Create the object
  const obj = store.create({
    typeId,
    properties: properties as Record<string, PropertyValue>,
    withContent: true,
    inboxed: true,
  });

  // Fetch and convert blocks
  try {
    const blocks = await getPageBlocks(client, page.id);

    if (blocks.length > 0) {
      // Build page relation map for @mention resolution
      const pageRelations = new Map<
        string,
        { id: string; title: string; typeId: string }
      >();
      for (const [notionId, mapping] of idMapping) {
        pageRelations.set(notionId, {
          id: mapping.objectId,
          title: mapping.title,
          typeId: mapping.typeId,
        });
      }

      const blockNoteBlocks = convertNotionBlocks(
        blocks as NotionBlock[],
        pageRelations
      );
      if (blockNoteBlocks.length > 0) {
        store.setContent(obj.id, JSON.stringify(blockNoteBlocks));
      }
    }
  } catch (error) {
    // Content fetch failed, but object was created
    console.warn(`Failed to fetch content for "${page.title}":`, error);
  }

  return obj.id;
}

/**
 * Preview what would be imported without actually importing
 */
export interface ImportPreview {
  databases: Array<{
    name: string;
    pageCount: number;
    inferredType: string;
    samplePages: string[];
  }>;
  standalonePageCount: number;
  estimatedTags: string[];
}

/**
 * Generate a preview of what would be imported
 */
export async function previewNotionImport(
  client: NotionClient,
  databases: SelectedDatabase[],
  includeStandalone: boolean
): Promise<ImportPreview> {
  const preview: ImportPreview = {
    databases: [],
    standalonePageCount: 0,
    estimatedTags: [],
  };

  const allTags = new Set<string>();

  for (const { database, targetTypeId, selected } of databases) {
    if (!selected) continue;

    try {
      const pages = await queryDatabase(client, database.id);
      const samplePages = pages.slice(0, 5).map((p) => p.title);

      // Scan for tags
      for (const page of pages) {
        const converted = convertNotionProperties(
          page.properties,
          targetTypeId
        );
        for (const tag of converted.pendingTags) {
          allTags.add(tag);
        }
      }

      preview.databases.push({
        name: database.name,
        pageCount: pages.length,
        inferredType: targetTypeId,
        samplePages,
      });
    } catch {
      preview.databases.push({
        name: database.name,
        pageCount: 0,
        inferredType: targetTypeId,
        samplePages: [],
      });
    }
  }

  if (includeStandalone) {
    try {
      const pages = await listStandalonePages(client);
      preview.standalonePageCount = pages.length;
    } catch {
      preview.standalonePageCount = 0;
    }
  }

  preview.estimatedTags = Array.from(allTags).sort();

  return preview;
}
