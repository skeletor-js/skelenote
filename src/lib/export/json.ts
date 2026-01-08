/**
 * JSON Full-Fidelity Backup Export
 *
 * Exports complete vault data as JSON including:
 * - All objects with their content
 * - Type definitions (for custom types)
 * - Metadata for restore compatibility
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type {
  SkelenoteObject,
  TypeDefinition,
  TypeRegistry,
} from '../types';

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
 * JSON backup format version for future migration support
 */
export const JSON_BACKUP_VERSION = 1;

/**
 * JSON export options
 */
export interface JSONExportOptions {
  /** Include type definitions in export */
  includeTypeDefinitions: boolean;
  /** Include archived objects */
  includeArchived: boolean;
  /** Pretty-print JSON with indentation */
  prettyPrint: boolean;
}

/**
 * Default JSON export options
 */
export const DEFAULT_JSON_OPTIONS: JSONExportOptions = {
  includeTypeDefinitions: true,
  includeArchived: true,
  prettyPrint: true,
};

/**
 * Exported object with content embedded
 */
export interface ExportedObject {
  /** The object data */
  object: SkelenoteObject;
  /** BlockNote content JSON (if hasContent is true) */
  content?: string;
}

/**
 * Full backup structure
 */
export interface SkelenoteBackup {
  /** Version number for future migration support */
  version: number;
  /** Export timestamp in ISO format */
  exportedAt: string;
  /** Application version that created this backup */
  appVersion: string;
  /** Type definitions (if included) */
  typeDefinitions?: TypeDefinition[];
  /** All objects with their content */
  objects: ExportedObject[];
  /** Metadata about the export */
  metadata: {
    objectCount: number;
    typeCount: number;
    exportOptions: JSONExportOptions;
  };
}

/**
 * Get the application version from package.json (or fallback)
 */
function getAppVersion(): string {
  // This would be injected at build time or read from package.json
  // For now, use a placeholder that can be updated
  return '0.2.0';
}

/**
 * Validate a backup file structure
 */
export function validateBackup(data: unknown): data is SkelenoteBackup {
  if (!data || typeof data !== 'object') return false;

  const backup = data as Record<string, unknown>;

  // Check required fields
  if (typeof backup.version !== 'number') return false;
  if (typeof backup.exportedAt !== 'string') return false;
  if (!Array.isArray(backup.objects)) return false;

  // Check version compatibility
  if (backup.version > JSON_BACKUP_VERSION) {
    console.warn(
      `Backup version ${backup.version} is newer than supported version ${JSON_BACKUP_VERSION}`
    );
  }

  // Validate objects structure
  for (const item of backup.objects) {
    if (!item || typeof item !== 'object') return false;
    const exportedObj = item as Record<string, unknown>;
    if (!exportedObj.object || typeof exportedObj.object !== 'object') {
      return false;
    }
  }

  return true;
}

/**
 * Generate JSON backup for all objects
 */
export function generateJSONBackup(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  options: JSONExportOptions = DEFAULT_JSON_OPTIONS
): SkelenoteBackup {
  // Filter archived if needed
  let filteredObjects = objects;
  if (!options.includeArchived) {
    filteredObjects = objects.filter((obj) => !obj.archived);
  }

  // Build exported objects with content
  const exportedObjects: ExportedObject[] = filteredObjects.map((obj) => {
    const exported: ExportedObject = {
      object: obj,
    };

    // Include content if the object has content
    if (obj.hasContent) {
      const content = getContent(obj.id);
      if (content) {
        exported.content = content;
      }
    }

    return exported;
  });

  // Collect type definitions if requested
  let typeDefinitions: TypeDefinition[] | undefined;
  if (options.includeTypeDefinitions) {
    // Get all unique type IDs from objects
    const typeIds = new Set(filteredObjects.map((obj) => obj.typeId));
    typeDefinitions = [];

    for (const typeId of typeIds) {
      const typeDef = typeRegistry.get(typeId);
      if (typeDef) {
        typeDefinitions.push(typeDef);
      }
    }
  }

  return {
    version: JSON_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    typeDefinitions,
    objects: exportedObjects,
    metadata: {
      objectCount: exportedObjects.length,
      typeCount: typeDefinitions?.length ?? 0,
      exportOptions: options,
    },
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
 * Export a single object to JSON
 */
export async function exportObjectToJSON(
  object: SkelenoteObject,
  typeDef: TypeDefinition,
  content: string,
  _resolveObjectName: (objectId: string) => string | undefined,
  options: Partial<JSONExportOptions> = {}
): Promise<string | null> {
  const mergedOptions = { ...DEFAULT_JSON_OPTIONS, ...options };

  const exportedObject: ExportedObject = {
    object,
    content: object.hasContent ? content : undefined,
  };

  const singleExport = {
    version: JSON_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    typeDefinition: mergedOptions.includeTypeDefinitions ? typeDef : undefined,
    object: exportedObject,
  };

  const jsonString = mergedOptions.prettyPrint
    ? JSON.stringify(singleExport, null, 2)
    : JSON.stringify(singleExport);

  const title = getObjectTitle(object);
  const defaultFilename = `${sanitizeFilename(title)}.json`;

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!filePath) return null;

  const finalPath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
  await writeTextFile(finalPath, jsonString);

  return finalPath;
}

/**
 * Export full vault backup to JSON file
 */
export async function exportVaultToJSON(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  options: JSONExportOptions = DEFAULT_JSON_OPTIONS,
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  const total = objects.length;

  onProgress?.({
    current: 0,
    total,
    phase: 'preparing',
  });

  // Generate the backup
  onProgress?.({
    current: 0,
    total,
    phase: 'exporting',
  });

  const backup = generateJSONBackup(objects, typeRegistry, getContent, options);

  onProgress?.({
    current: total,
    total,
    phase: 'compressing',
    currentObject: 'Generating JSON...',
  });

  // Convert to JSON string
  const jsonString = options.prettyPrint
    ? JSON.stringify(backup, null, 2)
    : JSON.stringify(backup);

  // Generate default filename with date
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `skelenote-backup-${date}.json`;

  // Open save dialog
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
  });

  if (!filePath) return null;

  const finalPath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
  await writeTextFile(finalPath, jsonString);

  onProgress?.({
    current: total,
    total,
    phase: 'complete',
  });

  return finalPath;
}

/**
 * Options for bulk JSON export (same as regular options)
 */
export interface JSONBulkExportOptions extends JSONExportOptions {
  /** Filter by type IDs (empty = all types) */
  typeIds?: string[];
}

/**
 * Export filtered objects to JSON backup
 */
export async function exportFilteredToJSON(
  objects: SkelenoteObject[],
  typeRegistry: TypeRegistry,
  getContent: (objectId: string) => string,
  options: JSONBulkExportOptions = DEFAULT_JSON_OPTIONS,
  onProgress?: (progress: BulkExportProgress) => void
): Promise<string | null> {
  // Filter by type IDs if specified
  let filteredObjects = objects;
  if (options.typeIds && options.typeIds.length > 0) {
    filteredObjects = objects.filter((obj) =>
      options.typeIds!.includes(obj.typeId)
    );
  }

  // Use the regular vault export with filtered objects
  return exportVaultToJSON(
    filteredObjects,
    typeRegistry,
    getContent,
    {
      includeTypeDefinitions: options.includeTypeDefinitions,
      includeArchived: options.includeArchived,
      prettyPrint: options.prettyPrint,
    },
    onProgress
  );
}
