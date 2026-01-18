/**
 * Backlink Index
 *
 * An inverted index that maintains O(1) backlink lookups.
 * Replaces the O(N) scan in RelationHelper.findBacklinks().
 *
 * Index structure:
 * - Primary: targetId -> Map<sourceId, BacklinkEntry>
 * - Reverse: sourceId -> Set<targetId> (for efficient updates)
 */

import type {
  SkelenoteObject,
  TypeRegistry,
  PropertyDefinition,
} from '../types';
import type { ObjectStore } from './objects';
import {
  extractMentionsFromContent,
  getRelationIds,
  type Backlink,
} from './relations';

/**
 * Check if a property definition is a relation type
 */
function isRelationProperty(propDef: PropertyDefinition): boolean {
  return propDef.type === 'relation';
}

/**
 * Get all relation properties from a type definition
 */
function getRelationProperties(typeDef: {
  schema: PropertyDefinition[];
}): PropertyDefinition[] {
  return typeDef.schema.filter(isRelationProperty);
}

/**
 * BacklinkIndex provides O(1) backlink lookups using an inverted index.
 *
 * The index maintains two maps:
 * 1. `index`: Maps target IDs to all sources that reference them
 * 2. `sourceToTargets`: Maps source IDs to all targets they reference (for efficient updates)
 *
 * When an object changes, we use `sourceToTargets` to find and remove old entries,
 * then re-index the object's current references.
 */
export class BacklinkIndex {
  /**
   * Primary index: targetId -> { sourceId -> BacklinkEntry }
   * This structure allows O(1) lookups and O(1) updates per entry.
   */
  private index: Map<string, Map<string, Backlink>> = new Map();

  /**
   * Reverse mapping: sourceId -> Set<targetId>
   * Used to efficiently find and remove all entries when a source changes.
   */
  private sourceToTargets: Map<string, Set<string>> = new Map();

  /**
   * Track indexed objects and their updatedAt timestamps.
   * Used to detect stale index entries.
   */
  private indexedObjects: Map<string, number> = new Map();

  private store: ObjectStore;
  private typeRegistry: TypeRegistry;
  private isRebuilding: boolean = false;

  constructor(store: ObjectStore, typeRegistry: TypeRegistry) {
    this.store = store;
    this.typeRegistry = typeRegistry;
  }

  /**
   * Full rebuild of the index from scratch.
   * Call this on startup or when the index may be stale.
   */
  rebuild(): void {
    this.isRebuilding = true;
    this.index.clear();
    this.sourceToTargets.clear();
    this.indexedObjects.clear();

    // Include archived objects in the index
    const allObjects = this.store.getAll({ includeArchived: true });

    for (const obj of allObjects) {
      this.indexObject(obj);
    }

    this.isRebuilding = false;
  }

  /**
   * Update the index for a single object that changed.
   * This is the incremental update path - much faster than rebuild().
   *
   * @param objectId - The ID of the object that changed
   */
  updateObject(objectId: string): void {
    // First, remove all existing entries for this source
    this.removeSourceEntries(objectId);

    // Then re-index if object still exists
    const obj = this.store.get(objectId);
    if (obj) {
      this.indexObject(obj);
    }
  }

  /**
   * Remove all index entries for a deleted object.
   * Called when an object is deleted from the store.
   *
   * @param objectId - The ID of the deleted object
   */
  removeObject(objectId: string): void {
    // Remove entries where this object is a source
    this.removeSourceEntries(objectId);

    // Also remove entries where this object is a target
    // (other objects may still reference it, but it no longer exists)
    this.index.delete(objectId);
    this.indexedObjects.delete(objectId);
  }

  /**
   * Get all backlinks to a target object.
   * O(1) lookup - returns immediately from the index.
   *
   * @param targetId - The object ID to find backlinks for
   * @returns Array of Backlink entries
   */
  getBacklinks(targetId: string): Backlink[] {
    const entries = this.index.get(targetId);
    if (!entries) {
      return [];
    }
    return Array.from(entries.values());
  }

  /**
   * Check if an object has any backlinks.
   * O(1) check.
   *
   * @param targetId - The object ID to check
   */
  hasBacklinks(targetId: string): boolean {
    const entries = this.index.get(targetId);
    return entries !== undefined && entries.size > 0;
  }

  /**
   * Get the count of backlinks to a target.
   * O(1) lookup.
   *
   * @param targetId - The object ID to count backlinks for
   */
  getBacklinkCount(targetId: string): number {
    const entries = this.index.get(targetId);
    return entries?.size ?? 0;
  }

  /**
   * Get all source IDs that reference a target.
   * Useful for bulk operations.
   *
   * @param targetId - The object ID to find sources for
   */
  getSourceIds(targetId: string): string[] {
    const entries = this.index.get(targetId);
    if (!entries) {
      return [];
    }
    return Array.from(entries.keys());
  }

  /**
   * Clear the entire index.
   * Used for testing or when switching stores.
   */
  clear(): void {
    this.index.clear();
    this.sourceToTargets.clear();
    this.indexedObjects.clear();
  }

  /**
   * Get the number of unique targets in the index.
   * Useful for debugging and testing.
   */
  get size(): number {
    return this.index.size;
  }

  /**
   * Check if the index is currently rebuilding.
   */
  get rebuilding(): boolean {
    return this.isRebuilding;
  }

  /**
   * Index a single object, extracting all its references.
   */
  private indexObject(obj: SkelenoteObject): void {
    const sourceId = obj.id;
    const typeDef = this.typeRegistry.get(obj.typeId);

    if (!typeDef) {
      // Unknown type - skip indexing
      return;
    }

    const targets = new Set<string>();

    // Index relation properties
    for (const propDef of getRelationProperties(typeDef)) {
      const value = obj.properties[propDef.id];
      const ids = getRelationIds(value);

      for (const targetId of ids) {
        this.addEntry(targetId, {
          sourceId,
          propertyId: propDef.id,
          propertyName: propDef.name,
        });
        targets.add(targetId);
      }
    }

    // Index @mentions in content
    if (typeDef.hasContent) {
      try {
        const content = this.store.getContent(sourceId);
        const mentionedIds = extractMentionsFromContent(content);

        for (const targetId of mentionedIds) {
          this.addEntry(targetId, {
            sourceId,
            propertyId: 'content',
            propertyName: 'Content',
          });
          targets.add(targetId);
        }
      } catch {
        // Content not available - skip
      }
    }

    // Track reverse mapping
    this.sourceToTargets.set(sourceId, targets);
    this.indexedObjects.set(sourceId, obj.updatedAt);
  }

  /**
   * Add an entry to the index.
   */
  private addEntry(targetId: string, entry: Backlink): void {
    let entries = this.index.get(targetId);
    if (!entries) {
      entries = new Map();
      this.index.set(targetId, entries);
    }

    // Use sourceId + propertyId as key to allow multiple backlinks from same source
    // (e.g., both a relation property AND a mention in content)
    const key = `${entry.sourceId}:${entry.propertyId}`;
    entries.set(key, entry);
  }

  /**
   * Remove all index entries where the given object is a source.
   */
  private removeSourceEntries(sourceId: string): void {
    const targets = this.sourceToTargets.get(sourceId);
    if (!targets) {
      return;
    }

    for (const targetId of targets) {
      const entries = this.index.get(targetId);
      if (entries) {
        // Remove all entries from this source
        for (const key of entries.keys()) {
          if (key.startsWith(`${sourceId}:`)) {
            entries.delete(key);
          }
        }

        // Clean up empty maps
        if (entries.size === 0) {
          this.index.delete(targetId);
        }
      }
    }

    this.sourceToTargets.delete(sourceId);
    this.indexedObjects.delete(sourceId);
  }
}

/**
 * Create a new BacklinkIndex instance.
 */
export function createBacklinkIndex(
  store: ObjectStore,
  typeRegistry: TypeRegistry
): BacklinkIndex {
  return new BacklinkIndex(store, typeRegistry);
}
