/**
 * Saved View types for persisting filter/sort configurations
 */

import type { FilterCondition, SortConfig } from '../loro/queries';

/**
 * A saved view persists filter/sort configuration for quick access
 */
export interface SavedView {
  /** Unique identifier (UUID) */
  id: string;

  /** User-defined name for the view */
  name: string;

  /** Filter conditions to apply */
  filters: FilterCondition[];

  /** Sort configuration (optional - uses default if not set) */
  sort?: SortConfig;

  /** Type ID filter (optional - null means all types) */
  typeFilter?: string | null;

  /** Icon identifier or emoji (optional) */
  icon?: string;

  /** Unix timestamp when created */
  createdAt: number;

  /** Unix timestamp when last updated */
  updatedAt: number;
}

/**
 * Input for creating a new saved view
 */
export interface CreateSavedViewInput {
  name: string;
  filters: FilterCondition[];
  sort?: SortConfig;
  typeFilter?: string | null;
  icon?: string;
}

/**
 * Input for updating an existing saved view
 */
export interface UpdateSavedViewInput {
  name?: string;
  filters?: FilterCondition[];
  sort?: SortConfig;
  typeFilter?: string | null;
  icon?: string;
}

/**
 * Generates a new UUID for views
 */
export function generateViewId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a new saved view from input
 */
export function createSavedView(input: CreateSavedViewInput): SavedView {
  const now = Date.now();

  return {
    id: generateViewId(),
    name: input.name,
    filters: input.filters,
    sort: input.sort,
    typeFilter: input.typeFilter,
    icon: input.icon,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Type guard to check if a value is a valid SavedView
 */
export function isSavedView(value: unknown): value is SavedView {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.filters) &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  );
}
