/**
 * Loro document schema for skelenote object storage
 *
 * Document Structure:
 * - Root LoroDoc contains:
 *   - "objects" LoroMap: Map of object ID -> serialized object data
 *   - "content:{id}" LoroText: Rich text content for objects with hasContent=true
 *   - "types" LoroMap: Map of type ID -> serialized type definition (for custom types)
 *   - "pinnedOrder" LoroList: Ordered list of pinned object IDs
 *   - "_views" LoroMap: Map of view ID -> serialized saved view configuration
 */

import type { LoroDoc, LoroMap, LoroText, LoroList } from 'loro-crdt';
import type { SkelenoteObject } from '../types/object';
import type { TypeDefinition } from '../types/type-definition';
import type { SavedView } from '../types/saved-view';

/** Key for the objects map in the root document */
export const OBJECTS_MAP_KEY = 'objects';

/** Key for the types map in the root document */
export const TYPES_MAP_KEY = 'types';

/** Key for the pinned order list in the root document */
export const PINNED_ORDER_KEY = 'pinnedOrder';

/** Key for the saved views map in the root document */
export const VIEWS_MAP_KEY = '_views';

/** Prefix for content text containers */
export const CONTENT_PREFIX = 'content:';

/**
 * Gets the content key for an object ID
 */
export function getContentKey(objectId: string): string {
  return `${CONTENT_PREFIX}${objectId}`;
}

/**
 * Gets the objects map from a Loro document
 */
export function getObjectsMap(doc: LoroDoc): LoroMap {
  return doc.getMap(OBJECTS_MAP_KEY);
}

/**
 * Gets the types map from a Loro document
 */
export function getTypesMap(doc: LoroDoc): LoroMap {
  return doc.getMap(TYPES_MAP_KEY);
}

/**
 * Gets or creates the content text container for an object
 */
export function getContentText(doc: LoroDoc, objectId: string): LoroText {
  return doc.getText(getContentKey(objectId));
}

/**
 * Gets the pinned order list from a Loro document
 * The list contains object IDs in display order
 */
export function getPinnedOrderList(doc: LoroDoc): LoroList {
  return doc.getList(PINNED_ORDER_KEY);
}

/**
 * Gets the saved views map from a Loro document
 */
export function getViewsMap(doc: LoroDoc): LoroMap {
  return doc.getMap(VIEWS_MAP_KEY);
}

/**
 * Serializes an SkelenoteObject to a JSON string for storage
 */
export function serializeObject(obj: SkelenoteObject): string {
  return JSON.stringify(obj);
}

/**
 * Deserializes a JSON string back to an SkelenoteObject
 * Handles backward compatibility for objects without the pinned property
 */
export function deserializeObject(data: string): SkelenoteObject {
  const obj = JSON.parse(data) as SkelenoteObject;
  // Handle backward compatibility for objects created before pinned was added
  if (obj.pinned === undefined) {
    obj.pinned = false;
  }
  return obj;
}

/**
 * Serializes a TypeDefinition to a JSON string for storage
 */
export function serializeType(type: TypeDefinition): string {
  return JSON.stringify(type);
}

/**
 * Deserializes a JSON string back to a TypeDefinition
 */
export function deserializeType(data: string): TypeDefinition {
  return JSON.parse(data) as TypeDefinition;
}

/**
 * Serializes a SavedView to a JSON string for storage
 */
export function serializeSavedView(view: SavedView): string {
  return JSON.stringify(view);
}

/**
 * Deserializes a JSON string back to a SavedView
 */
export function deserializeSavedView(data: string): SavedView {
  return JSON.parse(data) as SavedView;
}

/**
 * Schema version for migration support
 */
export const SCHEMA_VERSION = 1;

/**
 * Initialize document with schema version
 */
export function initializeDocument(doc: LoroDoc): void {
  const meta = doc.getMap('_meta');
  const existingVersion = meta.get('schemaVersion');

  if (existingVersion === undefined) {
    meta.set('schemaVersion', SCHEMA_VERSION);
  }
}

/**
 * Get schema version from document
 */
export function getSchemaVersion(doc: LoroDoc): number {
  const meta = doc.getMap('_meta');
  const version = meta.get('schemaVersion');
  return typeof version === 'number' ? version : 0;
}
