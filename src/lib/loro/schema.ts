/**
 * Loro document schema for Ephemera object storage
 *
 * Document Structure:
 * - Root LoroDoc contains:
 *   - "objects" LoroMap: Map of object ID -> serialized object data
 *   - "content:{id}" LoroText: Rich text content for objects with hasContent=true
 *   - "types" LoroMap: Map of type ID -> serialized type definition (for custom types)
 */

import type { LoroDoc, LoroMap, LoroText } from 'loro-crdt';
import type { EphemeraObject } from '../types/object';
import type { TypeDefinition } from '../types/type-definition';

/** Key for the objects map in the root document */
export const OBJECTS_MAP_KEY = 'objects';

/** Key for the types map in the root document */
export const TYPES_MAP_KEY = 'types';

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
 * Serializes an EphemeraObject to a JSON string for storage
 */
export function serializeObject(obj: EphemeraObject): string {
  return JSON.stringify(obj);
}

/**
 * Deserializes a JSON string back to an EphemeraObject
 */
export function deserializeObject(data: string): EphemeraObject {
  return JSON.parse(data) as EphemeraObject;
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
