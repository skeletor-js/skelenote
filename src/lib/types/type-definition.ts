/**
 * Type definition interfaces for the Ephemera object model
 */

import type { PropertyDefinition } from './property';

/**
 * Defines the schema and metadata for an object type
 */
export interface TypeDefinition {
  /** Unique identifier for this type */
  id: string;
  /** Display name of the type */
  name: string;
  /** Emoji icon representing this type */
  icon: string;
  /** Property definitions that make up this type's schema */
  schema: PropertyDefinition[];
  /** Whether objects of this type can have rich text content */
  hasContent: boolean;
  /** Whether this is a system-defined type (vs user-created) */
  isBuiltIn: boolean;
}

/**
 * IDs for built-in types
 */
export const BuiltInTypeIds = {
  TASK: 'task',
  NOTE: 'note',
  PROJECT: 'project',
  LINK: 'link',
  MEETING: 'meeting',
  TAG: 'tag',
  PERSON: 'person',
} as const;

export type BuiltInTypeId = (typeof BuiltInTypeIds)[keyof typeof BuiltInTypeIds];

/**
 * Registry for type definitions
 */
export interface TypeRegistry {
  /** Get a type definition by ID */
  get(typeId: string): TypeDefinition | undefined;
  /** Get all registered type definitions */
  getAll(): TypeDefinition[];
  /** Check if a type is registered */
  has(typeId: string): boolean;
  /** Register a new type definition */
  register(type: TypeDefinition): void;
}

/**
 * Creates a new type registry
 */
export function createTypeRegistry(initialTypes: TypeDefinition[] = []): TypeRegistry {
  const types = new Map<string, TypeDefinition>();

  for (const type of initialTypes) {
    types.set(type.id, type);
  }

  return {
    get(typeId: string): TypeDefinition | undefined {
      return types.get(typeId);
    },

    getAll(): TypeDefinition[] {
      return Array.from(types.values());
    },

    has(typeId: string): boolean {
      return types.has(typeId);
    },

    register(type: TypeDefinition): void {
      if (types.has(type.id)) {
        throw new Error(`Type with ID "${type.id}" is already registered`);
      }
      types.set(type.id, type);
    },
  };
}
