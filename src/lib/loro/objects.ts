/**
 * CRUD operations for Ephemera objects using Loro CRDT
 */

import type { LoroDoc } from 'loro-crdt';
import type {
  EphemeraObject,
  CreateObjectInput,
  UpdateObjectInput,
  PropertyValue,
  TypeDefinition,
  TypeRegistry,
} from '../types';
import { generateId, validatePropertyValue } from '../types';
import {
  getObjectsMap,
  getContentText,
  serializeObject,
  deserializeObject,
  initializeDocument,
} from './schema';

/**
 * Error thrown when an object is not found
 */
export class ObjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Object with ID "${id}" not found`);
    this.name = 'ObjectNotFoundError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * ObjectStore provides CRUD operations for Ephemera objects
 */
export class ObjectStore {
  private doc: LoroDoc;
  private typeRegistry: TypeRegistry;

  constructor(doc: LoroDoc, typeRegistry: TypeRegistry) {
    this.doc = doc;
    this.typeRegistry = typeRegistry;
    initializeDocument(doc);
  }

  /**
   * Create a new object
   */
  create(input: CreateObjectInput): EphemeraObject {
    const typeDef = this.typeRegistry.get(input.typeId);
    if (!typeDef) {
      throw new ValidationError(`Unknown type: ${input.typeId}`);
    }

    // Validate properties against schema
    const properties = input.properties ?? {};
    this.validateProperties(properties, typeDef);

    // Use provided ID or generate a new one
    const id = input.id ?? generateId();

    // Create the object
    const now = Date.now();
    const obj: EphemeraObject = {
      id,
      typeId: input.typeId,
      properties,
      hasContent: input.withContent ?? typeDef.hasContent,
      inboxed: input.inboxed ?? true,
      createdAt: now,
      updatedAt: now,
    };

    // Store in Loro
    const objectsMap = getObjectsMap(this.doc);
    objectsMap.set(obj.id, serializeObject(obj));

    // Initialize content if needed
    if (obj.hasContent) {
      getContentText(this.doc, obj.id);
    }

    return obj;
  }

  /**
   * Get an object by ID
   */
  get(id: string): EphemeraObject | undefined {
    const objectsMap = getObjectsMap(this.doc);
    const data = objectsMap.get(id);

    if (data === undefined || data === null || typeof data !== 'string') {
      return undefined;
    }

    return deserializeObject(data);
  }

  /**
   * Get an object by ID, throwing if not found
   */
  getOrThrow(id: string): EphemeraObject {
    const obj = this.get(id);
    if (!obj) {
      throw new ObjectNotFoundError(id);
    }
    return obj;
  }

  /**
   * Get all objects
   */
  getAll(): EphemeraObject[] {
    const objectsMap = getObjectsMap(this.doc);
    const objects: EphemeraObject[] = [];

    // Iterate over all entries in the map
    const entries = objectsMap.toJSON() as Record<string, string>;
    for (const data of Object.values(entries)) {
      if (typeof data === 'string') {
        objects.push(deserializeObject(data));
      }
    }

    return objects;
  }

  /**
   * Get all objects of a specific type
   */
  getByType(typeId: string): EphemeraObject[] {
    return this.getAll().filter((obj) => obj.typeId === typeId);
  }

  /**
   * Update an existing object
   */
  update(id: string, input: UpdateObjectInput): EphemeraObject {
    const obj = this.getOrThrow(id);
    const typeDef = this.typeRegistry.get(obj.typeId);

    // Merge and validate properties
    const newProperties = {
      ...obj.properties,
      ...input.properties,
    };

    if (typeDef) {
      this.validateProperties(newProperties, typeDef);
    }

    // Create updated object
    const updated: EphemeraObject = {
      ...obj,
      properties: newProperties,
      inboxed: input.inboxed ?? obj.inboxed,
      updatedAt: Date.now(),
    };

    // Store updated object
    const objectsMap = getObjectsMap(this.doc);
    objectsMap.set(id, serializeObject(updated));

    return updated;
  }

  /**
   * Set a single property value
   */
  setProperty(id: string, propertyId: string, value: PropertyValue): EphemeraObject {
    return this.update(id, {
      properties: { [propertyId]: value },
    });
  }

  /**
   * Delete an object
   */
  delete(id: string): boolean {
    const objectsMap = getObjectsMap(this.doc);
    const exists = objectsMap.get(id) !== undefined;

    if (exists) {
      objectsMap.delete(id);
    }

    return exists;
  }

  /**
   * Check if an object exists
   */
  exists(id: string): boolean {
    const objectsMap = getObjectsMap(this.doc);
    return objectsMap.get(id) !== undefined;
  }

  /**
   * Get the content text for an object
   */
  getContent(id: string): string {
    const obj = this.get(id);
    if (!obj || !obj.hasContent) {
      return '';
    }

    const contentText = getContentText(this.doc, id);
    return contentText.toString();
  }

  /**
   * Set the content for an object
   */
  setContent(id: string, content: string): void {
    const obj = this.getOrThrow(id);

    if (!obj.hasContent) {
      throw new ValidationError(`Object ${id} does not support content`);
    }

    const contentText = getContentText(this.doc, id);

    // Clear existing content and set new
    const currentLength = contentText.length;
    if (currentLength > 0) {
      contentText.delete(0, currentLength);
    }
    contentText.insert(0, content);

    // Update timestamp
    this.update(id, {});
  }

  /**
   * Mark object as processed (remove from inbox)
   */
  markProcessed(id: string): EphemeraObject {
    return this.update(id, { inboxed: false });
  }

  /**
   * Get all inboxed objects
   */
  getInboxed(): EphemeraObject[] {
    return this.getAll().filter((obj) => obj.inboxed);
  }

  /**
   * Validate properties against a type definition
   */
  private validateProperties(
    properties: Record<string, PropertyValue>,
    typeDef: TypeDefinition
  ): void {
    for (const propDef of typeDef.schema) {
      const value = properties[propDef.id] ?? null;
      const result = validatePropertyValue(value, propDef);

      if (!result.valid) {
        throw new ValidationError(result.error ?? 'Validation failed');
      }
    }
  }
}

/**
 * Create a new ObjectStore
 */
export function createObjectStore(doc: LoroDoc, typeRegistry: TypeRegistry): ObjectStore {
  return new ObjectStore(doc, typeRegistry);
}
