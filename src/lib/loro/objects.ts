/**
 * CRUD operations for skelenote objects using Loro CRDT
 */

import type { LoroDoc } from 'loro-crdt';
import type {
  SkelenoteObject,
  CreateObjectInput,
  UpdateObjectInput,
  PropertyValue,
  TypeDefinition,
  TypeRegistry,
} from '../types';
import { removeMentionsFromContent } from '../editor';
import { generateId, validatePropertyValue } from '../types';
import {
  getObjectsMap,
  getContentText,
  getPinnedOrderList,
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
 * ObjectStore provides CRUD operations for skelenote objects
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
  create(input: CreateObjectInput): SkelenoteObject {
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
    const obj: SkelenoteObject = {
      id,
      typeId: input.typeId,
      properties,
      hasContent: input.withContent ?? typeDef.hasContent,
      inboxed: input.inboxed ?? true,
      pinned: false,
      archived: false,
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
  get(id: string): SkelenoteObject | undefined {
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
  getOrThrow(id: string): SkelenoteObject {
    const obj = this.get(id);
    if (!obj) {
      throw new ObjectNotFoundError(id);
    }
    return obj;
  }

  /**
   * Options for querying objects
   */
  /**
   * Get all objects
   * @param options.includeArchived - Include archived objects (default: false)
   */
  getAll(options?: { includeArchived?: boolean }): SkelenoteObject[] {
    const objectsMap = getObjectsMap(this.doc);
    const objects: SkelenoteObject[] = [];

    // Iterate over all entries in the map
    const entries = objectsMap.toJSON() as Record<string, string>;
    for (const data of Object.values(entries)) {
      if (typeof data === 'string') {
        objects.push(deserializeObject(data));
      }
    }

    // Exclude archived unless explicitly requested
    if (!options?.includeArchived) {
      return objects.filter((obj) => !obj.archived);
    }

    return objects;
  }

  /**
   * Get all objects of a specific type
   * @param options.includeArchived - Include archived objects (default: false)
   */
  getByType(typeId: string, options?: { includeArchived?: boolean }): SkelenoteObject[] {
    return this.getAll(options).filter((obj) => obj.typeId === typeId);
  }

  /**
   * Update an existing object
   */
  update(id: string, input: UpdateObjectInput): SkelenoteObject {
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
    const updated: SkelenoteObject = {
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
  setProperty(id: string, propertyId: string, value: PropertyValue): SkelenoteObject {
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

      // Also remove from pinned order if present
      const pinnedOrder = getPinnedOrderList(this.doc);
      const orderArray = pinnedOrder.toArray() as string[];
      const index = orderArray.indexOf(id);
      if (index !== -1) {
        pinnedOrder.delete(index, 1);
      }
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
  markProcessed(id: string): SkelenoteObject {
    return this.update(id, { inboxed: false });
  }

  /**
   * Get all inboxed objects (excludes archived items)
   */
  getInboxed(): SkelenoteObject[] {
    return this.getAll().filter((obj) => obj.inboxed && !obj.archived);
  }

  /**
   * Pin an object to the sidebar
   */
  pin(objectId: string): SkelenoteObject {
    const obj = this.getOrThrow(objectId);

    // Already pinned - no-op
    if (obj.pinned) {
      return obj;
    }

    // Update the object's pinned state
    const updated: SkelenoteObject = {
      ...obj,
      pinned: true,
      updatedAt: Date.now(),
    };

    const objectsMap = getObjectsMap(this.doc);
    objectsMap.set(objectId, serializeObject(updated));

    // Add to pinned order list
    const pinnedOrder = getPinnedOrderList(this.doc);
    pinnedOrder.push(objectId);

    return updated;
  }

  /**
   * Unpin an object from the sidebar
   */
  unpin(objectId: string): SkelenoteObject {
    const obj = this.getOrThrow(objectId);

    // Already unpinned - no-op
    if (!obj.pinned) {
      return obj;
    }

    // Update the object's pinned state
    const updated: SkelenoteObject = {
      ...obj,
      pinned: false,
      updatedAt: Date.now(),
    };

    const objectsMap = getObjectsMap(this.doc);
    objectsMap.set(objectId, serializeObject(updated));

    // Remove from pinned order list
    const pinnedOrder = getPinnedOrderList(this.doc);
    const orderArray = pinnedOrder.toArray() as string[];
    const index = orderArray.indexOf(objectId);
    if (index !== -1) {
      pinnedOrder.delete(index, 1);
    }

    return updated;
  }

  /**
   * Reorder pinned objects
   */
  reorderPinned(objectIds: string[]): void {
    const pinnedOrder = getPinnedOrderList(this.doc);

    // Clear existing order
    const currentLength = pinnedOrder.length;
    if (currentLength > 0) {
      pinnedOrder.delete(0, currentLength);
    }

    // Add new order
    for (const id of objectIds) {
      pinnedOrder.push(id);
    }
  }

  /**
   * Get all pinned objects in order
   */
  getPinnedObjects(): SkelenoteObject[] {
    const pinnedOrder = getPinnedOrderList(this.doc);
    const orderArray = pinnedOrder.toArray() as string[];

    const objects: SkelenoteObject[] = [];
    for (const id of orderArray) {
      const obj = this.get(id);
      // Only include objects that exist and are still pinned
      if (obj && obj.pinned) {
        objects.push(obj);
      }
    }

    return objects;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Archive Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Archive an object (hides from default views)
   * Also removes from inbox to prevent logical inconsistency
   */
  archive(objectId: string): SkelenoteObject {
    const obj = this.getOrThrow(objectId);

    // Already archived - no-op
    if (obj.archived) {
      return obj;
    }

    // Update the object's archived state and remove from inbox
    const updated: SkelenoteObject = {
      ...obj,
      archived: true,
      inboxed: false,
      updatedAt: Date.now(),
    };

    const objectsMap = getObjectsMap(this.doc);
    objectsMap.set(objectId, serializeObject(updated));

    return updated;
  }

  /**
   * Unarchive an object (restores to default views)
   */
  unarchive(objectId: string): SkelenoteObject {
    const obj = this.getOrThrow(objectId);

    // Already unarchived - no-op
    if (!obj.archived) {
      return obj;
    }

    // Update the object's archived state
    const updated: SkelenoteObject = {
      ...obj,
      archived: false,
      updatedAt: Date.now(),
    };

    const objectsMap = getObjectsMap(this.doc);
    objectsMap.set(objectId, serializeObject(updated));

    return updated;
  }

  /**
   * Get all archived objects
   */
  getArchived(): SkelenoteObject[] {
    const objectsMap = getObjectsMap(this.doc);
    const objects: SkelenoteObject[] = [];

    const entries = objectsMap.toJSON() as Record<string, string>;
    for (const data of Object.values(entries)) {
      if (typeof data === 'string') {
        const obj = deserializeObject(data);
        if (obj.archived) {
          objects.push(obj);
        }
      }
    }

    return objects;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Batch Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Result type for batch operations
   */

  /**
   * Delete multiple objects with cleanup
   * - Removes @mentions from all object content
   * - Removes references from relation properties
   */
  deleteMany(ids: string[]): { deleted: number; errors: string[] } {
    const errors: string[] = [];
    const targetIds = new Set(ids);
    // Include archived objects for cleanup (we want to clean mentions from all objects)
    const allObjects = this.getAll({ includeArchived: true });

    // 1. Clean up @mentions in content (single pass for all targets)
    for (const obj of allObjects) {
      if (targetIds.has(obj.id)) continue;
      try {
        const content = this.getContent(obj.id);
        if (!content) continue;

        let cleaned = content;
        for (const targetId of targetIds) {
          const result = removeMentionsFromContent(cleaned, targetId);
          if (result) {
            cleaned = result;
          }
        }
        if (cleaned !== content) {
          this.setContent(obj.id, cleaned);
        }
      } catch {
        /* skip objects without content */
      }
    }

    // 2. Clean up relation references
    for (const obj of allObjects) {
      if (targetIds.has(obj.id)) continue;
      // Check all relation properties for references to deleted objects
      for (const [propId, value] of Object.entries(obj.properties)) {
        if (Array.isArray(value)) {
          const filtered = value.filter((v) => !targetIds.has(v as string));
          if (filtered.length !== value.length) {
            this.update(obj.id, { properties: { [propId]: filtered } });
          }
        }
      }
    }

    // 3. Delete all targets
    let deleted = 0;
    for (const id of targetIds) {
      try {
        if (this.delete(id)) deleted++;
      } catch {
        errors.push(id);
      }
    }

    return { deleted, errors };
  }

  /**
   * Update multiple objects with the same changes
   */
  updateMany(
    ids: string[],
    input: UpdateObjectInput
  ): { updated: SkelenoteObject[]; errors: string[] } {
    const updated: SkelenoteObject[] = [];
    const errors: string[] = [];

    for (const id of ids) {
      try {
        updated.push(this.update(id, input));
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  /**
   * Add a tag to multiple objects (skips if already tagged)
   */
  addTagToMany(ids: string[], tagId: string): { updated: number; errors: string[] } {
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        const currentTags = (obj.properties.tags as string[]) ?? [];
        if (!currentTags.includes(tagId)) {
          this.update(id, { properties: { tags: [...currentTags, tagId] } });
          updated++;
        }
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  /**
   * Remove a tag from multiple objects
   */
  removeTagFromMany(ids: string[], tagId: string): { updated: number; errors: string[] } {
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        const currentTags = (obj.properties.tags as string[]) ?? [];
        if (currentTags.includes(tagId)) {
          this.update(id, { properties: { tags: currentTags.filter((t) => t !== tagId) } });
          updated++;
        }
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  /**
   * Mark multiple objects as processed (removes from inbox)
   */
  markProcessedMany(ids: string[]): { processed: number; errors: string[] } {
    let processed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        this.markProcessed(id);
        processed++;
      } catch {
        errors.push(id);
      }
    }

    return { processed, errors };
  }

  /**
   * Change the type of multiple objects
   * Note: Properties that don't exist on the new type will become invisible but data is preserved
   */
  changeTypeMany(ids: string[], newTypeId: string): { updated: number; errors: string[] } {
    const typeDef = this.typeRegistry.get(newTypeId);
    if (!typeDef) {
      return { updated: 0, errors: ids };
    }

    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        // Skip if already the target type
        if (obj.typeId === newTypeId) continue;

        // Update the typeId directly in the serialized object
        const now = Date.now();
        const updatedObj: SkelenoteObject = {
          ...obj,
          typeId: newTypeId,
          updatedAt: now,
        };

        const objectsMap = getObjectsMap(this.doc);
        objectsMap.set(id, serializeObject(updatedObj));
        updated++;
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  /**
   * Set priority for multiple tasks
   */
  setPriorityMany(
    ids: string[],
    priority: string | null
  ): { updated: number; errors: string[] } {
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        // Only update tasks
        if (obj.typeId !== 'task') continue;
        this.update(id, { properties: { priority } });
        updated++;
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  /**
   * Set status for multiple tasks (e.g., mark complete/incomplete)
   */
  setStatusMany(ids: string[], status: string): { updated: number; errors: string[] } {
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        // Only update tasks
        if (obj.typeId !== 'task') continue;
        // Skip if already the target status
        if (obj.properties.status === status) continue;
        this.update(id, { properties: { status } });
        updated++;
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
  }

  /**
   * Pin multiple objects
   */
  pinMany(ids: string[]): { pinned: number; errors: string[] } {
    let pinned = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        if (!obj.pinned) {
          this.pin(id);
          pinned++;
        }
      } catch {
        errors.push(id);
      }
    }

    return { pinned, errors };
  }

  /**
   * Unpin multiple objects
   */
  unpinMany(ids: string[]): { unpinned: number; errors: string[] } {
    let unpinned = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        if (obj.pinned) {
          this.unpin(id);
          unpinned++;
        }
      } catch {
        errors.push(id);
      }
    }

    return { unpinned, errors };
  }

  /**
   * Archive multiple objects
   */
  archiveMany(ids: string[]): { archived: number; errors: string[] } {
    let archived = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        if (!obj.archived) {
          this.archive(id);
          archived++;
        }
      } catch {
        errors.push(id);
      }
    }

    return { archived, errors };
  }

  /**
   * Unarchive multiple objects
   */
  unarchiveMany(ids: string[]): { unarchived: number; errors: string[] } {
    let unarchived = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        if (obj.archived) {
          this.unarchive(id);
          unarchived++;
        }
      } catch {
        errors.push(id);
      }
    }

    return { unarchived, errors };
  }

  /**
   * Assign multiple objects to a project
   */
  assignToProjectMany(
    ids: string[],
    projectId: string | null
  ): { updated: number; errors: string[] } {
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const obj = this.getOrThrow(id);
        // Skip types that don't have project property (tags, projects themselves)
        if (['tag', 'project'].includes(obj.typeId)) continue;
        this.update(id, { properties: { project: projectId } });
        updated++;
      } catch {
        errors.push(id);
      }
    }

    return { updated, errors };
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
