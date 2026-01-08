/**
 * YAML frontmatter parser for Markdown import
 *
 * Extracts and parses YAML frontmatter from Markdown files,
 * converting values to Skelenote property formats.
 */

import matter from 'gray-matter';
import type {
  FrontmatterResult,
  FrontmatterValue,
  FolderMapping,
} from './types';
import type { PropertyValue } from '../types';
import { BuiltInTypeIds } from '../types';

/**
 * Parse frontmatter from Markdown content
 *
 * @param markdown - Raw Markdown string with optional frontmatter
 * @returns Parsed frontmatter and remaining content
 */
export function parseFrontmatter(markdown: string): FrontmatterResult {
  try {
    const parsed = matter(markdown);

    // Convert all values to our FrontmatterValue type
    const properties: Record<string, FrontmatterValue> = {};

    for (const [key, value] of Object.entries(parsed.data)) {
      properties[key] = normalizeValue(value);
    }

    return {
      properties,
      content: parsed.content.trim(),
      hasFrontmatter: Object.keys(parsed.data).length > 0,
    };
  } catch (error) {
    // If parsing fails, return content as-is with no frontmatter
    console.warn('Failed to parse frontmatter:', error);
    return {
      properties: {},
      content: markdown.trim(),
      hasFrontmatter: false,
    };
  }
}

/**
 * Normalize a frontmatter value to supported types
 */
function normalizeValue(value: unknown): FrontmatterValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    // Convert array items to strings
    return value.map((item) => String(item));
  }

  // For objects, stringify
  return String(value);
}

/**
 * Map frontmatter type to Skelenote type ID
 *
 * Supports common aliases from various note apps
 */
export function mapTypeToSkelenote(
  typeValue: string | undefined
): string | null {
  if (!typeValue) return null;

  const normalized = typeValue.toLowerCase().trim();

  // Direct matches
  const typeMap: Record<string, string> = {
    task: BuiltInTypeIds.TASK,
    todo: BuiltInTypeIds.TASK,
    note: BuiltInTypeIds.NOTE,
    project: BuiltInTypeIds.PROJECT,
    area: BuiltInTypeIds.AREA,
    link: BuiltInTypeIds.LINK,
    bookmark: BuiltInTypeIds.LINK,
    meeting: BuiltInTypeIds.MEETING,
    tag: BuiltInTypeIds.TAG,
    person: BuiltInTypeIds.PERSON,
    contact: BuiltInTypeIds.PERSON,
    template: BuiltInTypeIds.TEMPLATE,
  };

  return typeMap[normalized] || null;
}

/**
 * Convert kebab-case to camelCase for property keys
 */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Parse ISO date string or timestamp to number
 */
function parseDate(value: FrontmatterValue): number | null {
  if (value === null) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return null;
}

/**
 * Convert frontmatter properties to Skelenote property values
 *
 * Maps common frontmatter keys to Skelenote property IDs
 */
export function convertFrontmatterToProperties(
  frontmatter: Record<string, FrontmatterValue>,
  typeId: string
): Record<string, PropertyValue> {
  const properties: Record<string, PropertyValue> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null || key === 'type') continue;

    // Convert kebab-case to camelCase
    const propId = toCamelCase(key);

    // Handle date properties
    if (isDateProperty(propId)) {
      const dateValue = parseDate(value);
      if (dateValue !== null) {
        properties[propId] = dateValue;
      }
      continue;
    }

    // Handle boolean properties
    if (isBooleanProperty(propId)) {
      properties[propId] = Boolean(value);
      continue;
    }

    // Handle status with normalization
    if (propId === 'status') {
      properties[propId] = normalizeStatus(value, typeId);
      continue;
    }

    // Handle priority normalization
    if (propId === 'priority') {
      properties[propId] = normalizePriority(value);
      continue;
    }

    // Arrays stay as arrays (for tags, etc.)
    if (Array.isArray(value)) {
      // Note: These will need to be resolved to IDs later
      properties[propId] = value;
      continue;
    }

    // Convert Date to timestamp (shouldn't reach here normally, but handle just in case)
    if (value instanceof Date) {
      properties[propId] = value.getTime();
      continue;
    }

    // Everything else is stored as-is (string, number, boolean)
    properties[propId] = value;
  }

  return properties;
}

/**
 * Check if a property ID is a date property
 */
function isDateProperty(propId: string): boolean {
  const dateProps = [
    'created',
    'updated',
    'createdAt',
    'updatedAt',
    'dueDate',
    'startDate',
    'endDate',
    'startTime',
    'date',
  ];
  return dateProps.includes(propId);
}

/**
 * Check if a property ID is a boolean property
 */
function isBooleanProperty(propId: string): boolean {
  const boolProps = ['isDailyNote', 'isDailyNoteTemplate', 'checked', 'pinned'];
  return boolProps.includes(propId);
}

/**
 * Normalize status values from various formats
 */
function normalizeStatus(
  value: FrontmatterValue,
  typeId: string
): string | null {
  if (value === null || typeof value !== 'string') return null;

  const normalized = value.toLowerCase().trim();

  // Task statuses
  if (typeId === BuiltInTypeIds.TASK) {
    const taskStatusMap: Record<string, string> = {
      todo: 'todo',
      'to do': 'todo',
      'to-do': 'todo',
      open: 'todo',
      pending: 'todo',
      'in progress': 'in-progress',
      'in-progress': 'in-progress',
      inprogress: 'in-progress',
      doing: 'in-progress',
      started: 'in-progress',
      waiting: 'waiting',
      blocked: 'waiting',
      'on hold': 'waiting',
      'on-hold': 'waiting',
      done: 'done',
      complete: 'done',
      completed: 'done',
      finished: 'done',
      closed: 'done',
    };
    return taskStatusMap[normalized] || 'todo';
  }

  // Project statuses
  if (typeId === BuiltInTypeIds.PROJECT) {
    const projectStatusMap: Record<string, string> = {
      active: 'active',
      current: 'active',
      'in progress': 'active',
      'on hold': 'on-hold',
      'on-hold': 'on-hold',
      paused: 'on-hold',
      waiting: 'on-hold',
      completed: 'completed',
      done: 'completed',
      finished: 'completed',
      archived: 'archived',
      cancelled: 'archived',
      canceled: 'archived',
    };
    return projectStatusMap[normalized] || 'active';
  }

  return value;
}

/**
 * Normalize priority values
 */
function normalizePriority(value: FrontmatterValue): string | null {
  if (value === null) return null;

  const str =
    typeof value === 'number' ? String(value) : String(value).toLowerCase();

  const priorityMap: Record<string, string> = {
    '1': 'low',
    '2': 'medium',
    '3': 'high',
    '4': 'urgent',
    low: 'low',
    normal: 'medium',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
    critical: 'urgent',
  };

  return priorityMap[str] || null;
}

/**
 * Extract folder mapping from a file path
 *
 * Maps folder structure to Projects/Areas:
 * - Immediate parent folder → Project
 * - Grandparent folder → Area
 * - Intermediate folders → Tags
 *
 * @param filePath - Full file path or relative path
 * @returns Folder mapping for organization
 */
export function extractFolderMapping(filePath: string): FolderMapping {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Remove file name and split into parts
  const parts = normalized.split('/').filter(Boolean);

  // Remove the filename
  if (parts.length > 0 && parts[parts.length - 1].includes('.')) {
    parts.pop();
  }

  // Filter out common root folders
  const ignoreFolders = [
    'notes',
    'documents',
    'vault',
    'obsidian',
    'notion',
    'export',
    'backup',
  ];
  const meaningfulParts = parts.filter(
    (p) => !ignoreFolders.includes(p.toLowerCase())
  );

  if (meaningfulParts.length === 0) {
    return { folderTags: [] };
  }

  const result: FolderMapping = {
    folderTags: [],
  };

  // Last folder → Project
  if (meaningfulParts.length >= 1) {
    result.projectName = meaningfulParts[meaningfulParts.length - 1];
  }

  // Second-to-last folder → Area
  if (meaningfulParts.length >= 2) {
    result.areaName = meaningfulParts[meaningfulParts.length - 2];
  }

  // Any remaining folders → Tags
  if (meaningfulParts.length >= 3) {
    result.folderTags = meaningfulParts.slice(0, -2);
  }

  return result;
}

/**
 * Extract title from frontmatter, falling back to first H1
 */
export function extractTitle(
  frontmatter: Record<string, FrontmatterValue>,
  content: string,
  extractFromH1: boolean = true
): string {
  // Check frontmatter first
  if (frontmatter.title && typeof frontmatter.title === 'string') {
    return frontmatter.title;
  }

  if (frontmatter.name && typeof frontmatter.name === 'string') {
    return frontmatter.name;
  }

  // Extract from first H1 if enabled
  if (extractFromH1) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
  }

  return 'Untitled';
}
