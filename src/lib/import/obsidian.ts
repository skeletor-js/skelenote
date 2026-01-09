/**
 * Obsidian Vault Import
 *
 * Imports an Obsidian vault by:
 * 1. Reading all .md files via Tauri command
 * 2. Parsing frontmatter and content with existing markdown parser
 * 3. Extracting #hashtags from content
 * 4. Two-phase import: create objects first, then resolve wiki-links
 */

import { invoke } from '@tauri-apps/api/core';
import type { ObjectStore } from '../loro';
import type { PropertyValue } from '../types';
import { BuiltInTypeIds } from '../types';
import { importMarkdown } from './markdown';
import { convertWikiLinksToMentions } from './wiki-links';
import type { MarkdownImportResult, BlockNoteBlock } from './types';

/**
 * File returned from the Tauri read_vault_directory command
 */
export interface VaultFile {
  /** Relative path from vault root (e.g., "Projects/my-note.md") */
  path: string;
  /** File content as UTF-8 string */
  content: string;
}

/**
 * Parsed vault file ready for import
 */
export interface ParsedVaultFile {
  /** Original file path */
  path: string;
  /** File name without extension (used for wiki-link matching) */
  name: string;
  /** Parsed markdown result */
  parsed: MarkdownImportResult;
  /** Hashtags extracted from content */
  hashtags: string[];
  /** Whether this file should be imported */
  selected: boolean;
}

/**
 * Progress callback for import operations
 */
export type ObsidianProgressCallback = (
  progress: ObsidianImportProgress
) => void;

/**
 * Import progress state
 */
export interface ObsidianImportProgress {
  phase:
    | 'reading'
    | 'parsing'
    | 'creating-tags'
    | 'importing'
    | 'linking'
    | 'complete';
  current: number;
  total: number;
  currentFile?: string;
  message: string;
}

/**
 * Import result
 */
export interface ObsidianImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  /** Mapping of vault file names to created object IDs */
  fileToObjectId: Map<string, string>;
  /** Tags that were created */
  createdTags: Map<string, string>;
}

/**
 * Import options
 */
export interface ObsidianImportOptions {
  /** ObjectStore instance */
  store: ObjectStore;
  /** Vault directory path */
  vaultPath: string;
  /** Files to import (after user selection/type mapping) */
  files: ParsedVaultFile[];
  /** Progress callback */
  onProgress?: ObsidianProgressCallback;
}

/**
 * Hashtag pattern for Obsidian-style tags
 * Matches #tag-name but not ##heading or # alone
 * Tags can contain letters, numbers, hyphens, underscores, and forward slashes
 */
const HASHTAG_PATTERN = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/g;

/**
 * Extract hashtags from markdown content
 *
 * Obsidian uses #tag syntax inline in content.
 * This extracts all unique tags, normalized to lowercase.
 */
export function extractHashtags(content: string): string[] {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset regex state
  HASHTAG_PATTERN.lastIndex = 0;

  while ((match = HASHTAG_PATTERN.exec(content)) !== null) {
    // Normalize: lowercase, remove leading #
    const tag = match[1].toLowerCase();
    tags.add(tag);
  }

  return Array.from(tags);
}

/**
 * Get file name without extension from path
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.md$/i, '').replace(/\.markdown$/i, '');
}

/**
 * Read all markdown files from an Obsidian vault
 *
 * Calls the Tauri command to recursively read the vault directory.
 */
export async function readVaultDirectory(
  vaultPath: string
): Promise<VaultFile[]> {
  return invoke<VaultFile[]>('read_vault_directory', { directory: vaultPath });
}

/**
 * Parse vault files into import-ready structures
 *
 * This is the first phase: parse all files to understand types,
 * extract hashtags, and prepare for user review.
 */
export function parseVaultFiles(files: VaultFile[]): ParsedVaultFile[] {
  return files.map((file) => {
    const parsed = importMarkdown(file.content, {
      filePath: file.path,
      extractTitleFromH1: true,
    });

    const hashtags = extractHashtags(file.content);

    return {
      path: file.path,
      name: getFileName(file.path),
      parsed,
      hashtags,
      selected: true,
    };
  });
}

/**
 * Import an Obsidian vault
 *
 * Two-phase import:
 * 1. Create all objects (with placeholder wiki-links)
 * 2. Resolve wiki-links to actual object references
 */
export async function importObsidianVault(
  options: ObsidianImportOptions
): Promise<ObsidianImportResult> {
  const { store, files, onProgress } = options;

  const errors: string[] = [];
  const fileToObjectId = new Map<string, string>();
  const createdTags = new Map<string, string>();

  // Filter to selected files only
  const selectedFiles = files.filter((f) => f.selected);

  if (selectedFiles.length === 0) {
    return {
      success: true,
      imported: 0,
      skipped: files.length,
      errors: [],
      fileToObjectId,
      createdTags,
    };
  }

  // Phase 1: Collect all hashtags and create Tag objects
  onProgress?.({
    phase: 'creating-tags',
    current: 0,
    total: selectedFiles.length,
    message: 'Creating tags...',
  });

  const allTags = new Set<string>();
  for (const file of selectedFiles) {
    for (const tag of file.hashtags) {
      allTags.add(tag);
    }
    // Also check frontmatter tags
    const fmTags = file.parsed.properties.tags;
    if (Array.isArray(fmTags)) {
      for (const tag of fmTags) {
        if (typeof tag === 'string') {
          allTags.add(tag.toLowerCase());
        }
      }
    }
  }

  // Find existing tags and create new ones
  const existingObjects = store.getAll();
  const existingTags = new Map<string, string>();

  for (const obj of existingObjects) {
    if (obj.typeId === BuiltInTypeIds.TAG) {
      const title = obj.properties.title;
      if (typeof title === 'string') {
        existingTags.set(title.toLowerCase(), obj.id);
      }
    }
  }

  for (const tagName of allTags) {
    if (existingTags.has(tagName)) {
      createdTags.set(tagName, existingTags.get(tagName)!);
    } else {
      // Create new tag
      const tagObj = store.create({
        typeId: BuiltInTypeIds.TAG,
        properties: {
          title: tagName,
        },
        inboxed: false, // Tags don't go to inbox
      });
      createdTags.set(tagName, tagObj.id);
    }
  }

  // Phase 2: Create all objects (first pass - no wiki-link resolution)
  onProgress?.({
    phase: 'importing',
    current: 0,
    total: selectedFiles.length,
    message: 'Importing files...',
  });

  let imported = 0;

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];

    onProgress?.({
      phase: 'importing',
      current: i,
      total: selectedFiles.length,
      currentFile: file.name,
      message: `Importing ${file.name}...`,
    });

    try {
      const { parsed, hashtags } = file;

      // Build properties
      const properties: Record<string, PropertyValue> = {
        title: parsed.title,
        ...parsed.properties,
      };

      // Remove internal hint properties
      delete properties._suggestedProject;
      delete properties._suggestedArea;
      delete properties._suggestedTags;

      // Add tag relations from hashtags
      const tagIds: string[] = [];
      for (const tag of hashtags) {
        const tagId = createdTags.get(tag.toLowerCase());
        if (tagId) {
          tagIds.push(tagId);
        }
      }
      if (tagIds.length > 0) {
        properties.tags = tagIds;
      }

      // Create the object
      const obj = store.create({
        typeId: parsed.typeId || BuiltInTypeIds.NOTE,
        properties,
        withContent: parsed.blocks.length > 0,
        inboxed: true,
      });

      // Store content (wiki-links not yet resolved)
      if (parsed.blocks.length > 0) {
        store.setContent(obj.id, JSON.stringify(parsed.blocks));
      }

      // Map file name to object ID for wiki-link resolution
      fileToObjectId.set(file.name.toLowerCase(), obj.id);
      imported++;
    } catch (error) {
      errors.push(
        `Failed to import "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Phase 3: Resolve wiki-links
  onProgress?.({
    phase: 'linking',
    current: 0,
    total: imported,
    message: 'Resolving wiki-links...',
  });

  // Build a resolver function
  const resolveWikiLink = (
    target: string
  ): { id: string; typeId?: string } | null => {
    // Obsidian wiki-links can be:
    // - [[Note Name]] - matches by file name
    // - [[folder/Note Name]] - matches by path
    // - [[Note Name#heading]] - with heading anchor
    // - [[Note Name|display]] - with display text (already handled)

    // Remove heading anchor if present
    const targetWithoutAnchor = target.split('#')[0].trim();

    // Try exact match first
    const exactMatch = fileToObjectId.get(targetWithoutAnchor.toLowerCase());
    if (exactMatch) {
      return { id: exactMatch };
    }

    // Try matching just the file name part (for path-based links)
    const fileName = getFileName(targetWithoutAnchor);
    const fileMatch = fileToObjectId.get(fileName.toLowerCase());
    if (fileMatch) {
      return { id: fileMatch };
    }

    return null;
  };

  // Update content for each imported object
  let linkingProgress = 0;
  for (const [fileName, objectId] of fileToObjectId) {
    const file = selectedFiles.find((f) => f.name.toLowerCase() === fileName);
    if (!file || file.parsed.blocks.length === 0) continue;

    onProgress?.({
      phase: 'linking',
      current: linkingProgress++,
      total: fileToObjectId.size,
      currentFile: file.name,
      message: `Resolving links in ${file.name}...`,
    });

    // Check if this file has wiki-links
    if (file.parsed.wikiLinks.length === 0) continue;

    try {
      // Re-parse with wiki-link resolution
      const { blocks: resolvedBlocks } = convertWikiLinksToMentions(
        file.parsed.blocks as BlockNoteBlock[],
        resolveWikiLink
      );

      // Update content
      store.setContent(objectId, JSON.stringify(resolvedBlocks));
    } catch (error) {
      // Non-fatal: wiki-links just won't be resolved
      console.warn(`Failed to resolve wiki-links in ${file.name}:`, error);
    }
  }

  onProgress?.({
    phase: 'complete',
    current: imported,
    total: selectedFiles.length,
    message: `Imported ${imported} files`,
  });

  return {
    success: errors.length === 0,
    imported,
    skipped: files.length - imported,
    errors,
    fileToObjectId,
    createdTags,
  };
}

/**
 * Infer Skelenote type from Obsidian file
 *
 * Uses frontmatter type field, folder structure, and content analysis.
 */
export function inferTypeFromVaultFile(file: ParsedVaultFile): {
  typeId: string;
  confidence: number;
} {
  // If frontmatter specifies type, trust it
  if (file.parsed.typeId && file.parsed.typeId !== BuiltInTypeIds.NOTE) {
    return { typeId: file.parsed.typeId, confidence: 0.9 };
  }

  // Check folder path for hints
  const lowerPath = file.path.toLowerCase();

  if (lowerPath.includes('/tasks/') || lowerPath.includes('/todo/')) {
    return { typeId: BuiltInTypeIds.TASK, confidence: 0.7 };
  }

  if (lowerPath.includes('/projects/')) {
    return { typeId: BuiltInTypeIds.PROJECT, confidence: 0.7 };
  }

  if (
    lowerPath.includes('/meetings/') ||
    lowerPath.includes('/notes/meetings/')
  ) {
    return { typeId: BuiltInTypeIds.MEETING, confidence: 0.7 };
  }

  if (lowerPath.includes('/people/') || lowerPath.includes('/contacts/')) {
    return { typeId: BuiltInTypeIds.PERSON, confidence: 0.7 };
  }

  if (lowerPath.includes('/areas/')) {
    return { typeId: BuiltInTypeIds.AREA, confidence: 0.6 };
  }

  // Check frontmatter properties for task-like content
  const props = file.parsed.properties;
  if (props.status || props.due || props.dueDate || props.priority) {
    return { typeId: BuiltInTypeIds.TASK, confidence: 0.6 };
  }

  // Check for meeting-like properties
  if (props.date && (props.attendees || props.participants)) {
    return { typeId: BuiltInTypeIds.MEETING, confidence: 0.6 };
  }

  // Default to Note
  return { typeId: BuiltInTypeIds.NOTE, confidence: 0.5 };
}
