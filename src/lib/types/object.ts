/**
 * Core object interfaces for the Ephemera object model
 */

import type { PropertyValue } from './property';

/**
 * The core Object type - all data in Ephemera is stored as Objects
 */
export interface EphemeraObject {
  /** Unique identifier (UUID) */
  id: string;
  /** References a TypeDefinition ID */
  typeId: string;
  /** Property values keyed by property ID */
  properties: Record<string, PropertyValue>;
  /** Whether this object has associated rich text content */
  hasContent: boolean;
  /** True until the object has been explicitly processed/triaged */
  inboxed: boolean;
  /** Unix timestamp (milliseconds) when created */
  createdAt: number;
  /** Unix timestamp (milliseconds) when last updated */
  updatedAt: number;
}

/**
 * Data required to create a new object (without auto-generated fields)
 */
export interface CreateObjectInput {
  /** The type of object to create */
  typeId: string;
  /** Initial property values */
  properties?: Record<string, PropertyValue>;
  /** Whether to add initial content (defaults based on type's hasContent) */
  withContent?: boolean;
  /** Override the default inboxed state (defaults to true) */
  inboxed?: boolean;
  /** Optional custom ID (defaults to auto-generated UUID) */
  id?: string;
}

/**
 * Data for updating an existing object
 */
export interface UpdateObjectInput {
  /** Property values to update (merged with existing) */
  properties?: Record<string, PropertyValue>;
  /** Update the inboxed state */
  inboxed?: boolean;
}

/**
 * Generates a new UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a new object with auto-generated fields
 */
export function createObject(input: CreateObjectInput): EphemeraObject {
  const now = Date.now();

  return {
    id: generateId(),
    typeId: input.typeId,
    properties: input.properties ?? {},
    hasContent: input.withContent ?? false,
    inboxed: input.inboxed ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Type guard to check if a value is a valid EphemeraObject
 */
export function isEphemeraObject(value: unknown): value is EphemeraObject {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.typeId === 'string' &&
    typeof obj.properties === 'object' &&
    obj.properties !== null &&
    typeof obj.hasContent === 'boolean' &&
    typeof obj.inboxed === 'boolean' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  );
}
