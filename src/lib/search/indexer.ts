/**
 * Search index builder
 * Builds SearchableItem array from SkelenoteObjects
 */

import type { SkelenoteObject } from '@/lib/types/object';
import type { TypeRegistry } from '@/lib/types/type-definition';
import type { PropertyValue, PropertyType } from '@/lib/types/property';
import type { ObjectStore } from '@/lib/loro/objects';
import type { SearchableItem } from './types';
import { extractPlainTextFromContent } from './extract';

/**
 * Property types that contain searchable text
 */
const SEARCHABLE_PROPERTY_TYPES: PropertyType[] = [
  'text',
  'url',
  'email',
  'phone',
  'select',
];

/**
 * Extract the title/name from an object's properties
 */
function extractTitle(obj: SkelenoteObject): string {
  const title = obj.properties.title ?? obj.properties.name;
  if (typeof title === 'string') {
    return title;
  }
  return '';
}

/**
 * Check if a property type is searchable
 */
function isSearchableType(type: PropertyType): boolean {
  return SEARCHABLE_PROPERTY_TYPES.includes(type);
}

/**
 * Extract searchable text from a property value
 */
function extractPropertyText(value: PropertyValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return '';
  }
  if (Array.isArray(value)) {
    // For relation arrays, we don't include IDs in search
    // The related object names are not resolved here to keep indexing fast
    return '';
  }
  return '';
}

/**
 * Extract concatenated searchable properties from an object
 * Excludes title/name (indexed separately) and relation properties
 */
function extractSearchableProperties(
  obj: SkelenoteObject,
  typeRegistry: TypeRegistry
): string {
  const typeDef = typeRegistry.get(obj.typeId);
  if (!typeDef) {
    return '';
  }

  const texts: string[] = [];

  for (const propDef of typeDef.schema) {
    // Skip title and name (indexed separately)
    if (propDef.id === 'title' || propDef.id === 'name') {
      continue;
    }

    // Skip hidden properties
    if (propDef.hidden) {
      continue;
    }

    // Only include searchable property types
    if (!isSearchableType(propDef.type)) {
      continue;
    }

    const value = obj.properties[propDef.id];
    const text = extractPropertyText(value);
    if (text) {
      texts.push(text);
    }
  }

  return texts.join(' ');
}

/**
 * Build a SearchableItem from an SkelenoteObject
 */
function buildSearchableItem(
  obj: SkelenoteObject,
  typeRegistry: TypeRegistry,
  store: ObjectStore
): SearchableItem {
  const title = extractTitle(obj);
  const properties = extractSearchableProperties(obj, typeRegistry);

  // Extract content if the object has it
  let content = '';
  if (obj.hasContent) {
    const rawContent = store.getContent(obj.id);
    content = extractPlainTextFromContent(rawContent);
  }

  return {
    id: obj.id,
    typeId: obj.typeId,
    title,
    properties,
    content,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Build the complete search index from all objects
 * @param store - The object store to read from
 * @param typeRegistry - Type definitions for property extraction
 * @returns Array of SearchableItem for all objects
 */
export function buildSearchIndex(
  store: ObjectStore,
  typeRegistry: TypeRegistry
): SearchableItem[] {
  const objects = store.getAll();
  return objects.map((obj) => buildSearchableItem(obj, typeRegistry, store));
}

/**
 * Update a single item in the search index
 * Useful for incremental updates when an object changes
 */
export function buildSearchableItemForObject(
  obj: SkelenoteObject,
  typeRegistry: TypeRegistry,
  store: ObjectStore
): SearchableItem {
  return buildSearchableItem(obj, typeRegistry, store);
}
