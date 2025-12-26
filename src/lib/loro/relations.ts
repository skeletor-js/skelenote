/**
 * Relation and backlink utilities for Ephemera objects
 */

import type {
  EphemeraObject,
  PropertyValue,
  TypeDefinition,
  TypeRegistry,
  PropertyDefinition,
} from '../types';
import type { ObjectStore } from './objects';

/**
 * Represents a backlink from one object to another
 */
export interface Backlink {
  /** The object that contains the relation */
  sourceId: string;
  /** The property that contains the relation (or 'content' for mentions) */
  propertyId: string;
  /** The name of the property (or 'Content' for mentions) */
  propertyName: string;
}

/**
 * Extract all mentioned object IDs from BlockNote content JSON
 * Recursively searches for inline mention content
 */
export function extractMentionsFromContent(content: string | null): string[] {
  if (!content) return [];

  try {
    const blocks = JSON.parse(content);
    const mentions: string[] = [];

    // Recursively find mentions in blocks
    function searchBlocks(items: unknown[]): void {
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;

        const block = item as Record<string, unknown>;

        // Check if this is a mention inline content
        if (block.type === 'mention' && block.props) {
          const props = block.props as Record<string, unknown>;
          if (typeof props.objectId === 'string') {
            mentions.push(props.objectId);
          }
        }

        // Search in content array (inline content)
        if (Array.isArray(block.content)) {
          searchBlocks(block.content);
        }

        // Search in children array (nested blocks)
        if (Array.isArray(block.children)) {
          searchBlocks(block.children);
        }
      }
    }

    if (Array.isArray(blocks)) {
      searchBlocks(blocks);
    }

    return mentions;
  } catch {
    return [];
  }
}

/**
 * Get all relation property IDs from a property value
 */
export function getRelationIds(value: PropertyValue): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

/**
 * Check if a property definition is a relation type
 */
export function isRelationProperty(propDef: PropertyDefinition): boolean {
  return propDef.type === 'relation';
}

/**
 * Get all relation properties from a type definition
 */
export function getRelationProperties(typeDef: TypeDefinition): PropertyDefinition[] {
  return typeDef.schema.filter(isRelationProperty);
}

/**
 * RelationHelper provides utilities for managing relations and computing backlinks
 */
export class RelationHelper {
  private store: ObjectStore;
  private typeRegistry: TypeRegistry;

  constructor(store: ObjectStore, typeRegistry: TypeRegistry) {
    this.store = store;
    this.typeRegistry = typeRegistry;
  }

  /**
   * Get all objects that the given object relates to
   */
  getRelatedObjects(objectId: string): EphemeraObject[] {
    const obj = this.store.get(objectId);
    if (!obj) return [];

    const typeDef = this.typeRegistry.get(obj.typeId);
    if (!typeDef) return [];

    const relatedIds = new Set<string>();

    for (const propDef of getRelationProperties(typeDef)) {
      const value = obj.properties[propDef.id];
      for (const id of getRelationIds(value)) {
        relatedIds.add(id);
      }
    }

    const related: EphemeraObject[] = [];
    for (const id of relatedIds) {
      const relatedObj = this.store.get(id);
      if (relatedObj) {
        related.push(relatedObj);
      }
    }

    return related;
  }

  /**
   * Find all objects that reference the given object ID (backlinks)
   * Includes both relation properties and @-mentions in content
   */
  findBacklinks(targetId: string): Backlink[] {
    const backlinks: Backlink[] = [];

    for (const obj of this.store.getAll()) {
      const typeDef = this.typeRegistry.get(obj.typeId);
      if (!typeDef) continue;

      // Check relation properties
      for (const propDef of getRelationProperties(typeDef)) {
        const value = obj.properties[propDef.id];
        const ids = getRelationIds(value);

        if (ids.includes(targetId)) {
          backlinks.push({
            sourceId: obj.id,
            propertyId: propDef.id,
            propertyName: propDef.name,
          });
        }
      }

      // Check content for @-mentions
      if (typeDef.hasContent) {
        try {
          const content = this.store.getContent(obj.id);
          const mentionedIds = extractMentionsFromContent(content);

          if (mentionedIds.includes(targetId)) {
            backlinks.push({
              sourceId: obj.id,
              propertyId: 'content',
              propertyName: 'Content',
            });
          }
        } catch {
          // Content not available, skip
        }
      }
    }

    return backlinks;
  }

  /**
   * Get all objects that reference the given object
   */
  getBacklinkedObjects(targetId: string): EphemeraObject[] {
    const backlinks = this.findBacklinks(targetId);
    const seen = new Set<string>();
    const objects: EphemeraObject[] = [];

    for (const backlink of backlinks) {
      if (!seen.has(backlink.sourceId)) {
        seen.add(backlink.sourceId);
        const obj = this.store.get(backlink.sourceId);
        if (obj) {
          objects.push(obj);
        }
      }
    }

    return objects;
  }

  /**
   * Add a relation between two objects
   */
  addRelation(sourceId: string, propertyId: string, targetId: string): void {
    const obj = this.store.get(sourceId);
    if (!obj) return;

    const currentValue = obj.properties[propertyId];
    const currentIds = getRelationIds(currentValue);

    if (!currentIds.includes(targetId)) {
      this.store.setProperty(sourceId, propertyId, [...currentIds, targetId]);
    }
  }

  /**
   * Remove a relation between two objects
   */
  removeRelation(sourceId: string, propertyId: string, targetId: string): void {
    const obj = this.store.get(sourceId);
    if (!obj) return;

    const currentValue = obj.properties[propertyId];
    const currentIds = getRelationIds(currentValue);
    const newIds = currentIds.filter((id) => id !== targetId);

    this.store.setProperty(sourceId, propertyId, newIds);
  }

  /**
   * Get objects related by a specific property
   */
  getRelatedByProperty(objectId: string, propertyId: string): EphemeraObject[] {
    const obj = this.store.get(objectId);
    if (!obj) return [];

    const value = obj.properties[propertyId];
    const ids = getRelationIds(value);

    const related: EphemeraObject[] = [];
    for (const id of ids) {
      const relatedObj = this.store.get(id);
      if (relatedObj) {
        related.push(relatedObj);
      }
    }

    return related;
  }

  /**
   * Check if two objects are related
   */
  areRelated(sourceId: string, targetId: string): boolean {
    const obj = this.store.get(sourceId);
    if (!obj) return false;

    const typeDef = this.typeRegistry.get(obj.typeId);
    if (!typeDef) return false;

    for (const propDef of getRelationProperties(typeDef)) {
      const value = obj.properties[propDef.id];
      if (getRelationIds(value).includes(targetId)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Create a new RelationHelper
 */
export function createRelationHelper(
  store: ObjectStore,
  typeRegistry: TypeRegistry
): RelationHelper {
  return new RelationHelper(store, typeRegistry);
}
