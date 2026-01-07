/**
 * Query helpers for filtering and sorting skelenote objects
 */

import type { SkelenoteObject, PropertyValue } from '../types';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Property ID or built-in field to sort by */
  field: string;
  /** Sort direction */
  direction: SortDirection;
}

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'eq' // equals
  | 'neq' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'contains' // string contains
  | 'startsWith' // string starts with
  | 'endsWith' // string ends with
  | 'in' // value in array
  | 'notIn' // value not in array
  | 'isNull' // value is null
  | 'isNotNull'; // value is not null

/**
 * Filter condition
 */
export interface FilterCondition {
  /** Property ID or built-in field to filter by */
  field: string;
  /** Filter operator */
  operator: FilterOperator;
  /** Value to compare against */
  value?: PropertyValue | PropertyValue[];
}

/**
 * Query configuration
 */
export interface QueryConfig {
  /** Filter conditions (ANDed together) */
  filters?: FilterCondition[];
  /** Sort configuration */
  sort?: SortConfig;
  /** Maximum number of results */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
}

/**
 * Get a field value from an object (supports properties and built-in fields)
 */
function getFieldValue(obj: SkelenoteObject, field: string): PropertyValue {
  switch (field) {
    case 'id':
      return obj.id;
    case 'typeId':
      return obj.typeId;
    case 'inboxed':
      return obj.inboxed;
    case 'pinned':
      return obj.pinned;
    case 'archived':
      return obj.archived;
    case 'createdAt':
      return obj.createdAt;
    case 'updatedAt':
      return obj.updatedAt;
    default:
      return obj.properties[field] ?? null;
  }
}

/**
 * Apply a filter condition to an object
 */
function matchesFilter(obj: SkelenoteObject, filter: FilterCondition): boolean {
  const value = getFieldValue(obj, filter.field);
  const filterValue = filter.value;

  switch (filter.operator) {
    case 'eq':
      return value === filterValue;

    case 'neq':
      return value !== filterValue;

    case 'gt':
      if (typeof value !== 'number' || typeof filterValue !== 'number')
        return false;
      return value > filterValue;

    case 'gte':
      if (typeof value !== 'number' || typeof filterValue !== 'number')
        return false;
      return value >= filterValue;

    case 'lt':
      if (typeof value !== 'number' || typeof filterValue !== 'number')
        return false;
      return value < filterValue;

    case 'lte':
      if (typeof value !== 'number' || typeof filterValue !== 'number')
        return false;
      return value <= filterValue;

    case 'contains':
      if (typeof value !== 'string' || typeof filterValue !== 'string')
        return false;
      return value.toLowerCase().includes(filterValue.toLowerCase());

    case 'startsWith':
      if (typeof value !== 'string' || typeof filterValue !== 'string')
        return false;
      return value.toLowerCase().startsWith(filterValue.toLowerCase());

    case 'endsWith':
      if (typeof value !== 'string' || typeof filterValue !== 'string')
        return false;
      return value.toLowerCase().endsWith(filterValue.toLowerCase());

    case 'in':
      if (!Array.isArray(filterValue)) return false;
      return (filterValue as PropertyValue[]).includes(value);

    case 'notIn':
      if (!Array.isArray(filterValue)) return true;
      return !(filterValue as PropertyValue[]).includes(value);

    case 'isNull':
      return value === null;

    case 'isNotNull':
      return value !== null;

    default:
      return true;
  }
}

/**
 * Compare two values for sorting
 */
function compareValues(
  a: PropertyValue,
  b: PropertyValue,
  direction: SortDirection
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  // Handle nulls
  if (a === null && b === null) return 0;
  if (a === null) return multiplier;
  if (b === null) return -multiplier;

  // Handle arrays (compare by length)
  if (Array.isArray(a) && Array.isArray(b)) {
    return (a.length - b.length) * multiplier;
  }

  // Handle different types
  if (typeof a !== typeof b) {
    return String(a).localeCompare(String(b)) * multiplier;
  }

  // Handle same types
  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * multiplier;
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b) * multiplier;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (Number(a) - Number(b)) * multiplier;
  }

  return 0;
}

/**
 * Execute a query on a list of objects
 */
export function executeQuery(
  objects: SkelenoteObject[],
  config: QueryConfig
): SkelenoteObject[] {
  let result = [...objects];

  // Apply filters
  if (config.filters && config.filters.length > 0) {
    result = result.filter((obj) =>
      config.filters!.every((filter) => matchesFilter(obj, filter))
    );
  }

  // Apply sort
  if (config.sort) {
    const { field, direction } = config.sort;
    result.sort((a, b) =>
      compareValues(getFieldValue(a, field), getFieldValue(b, field), direction)
    );
  }

  // Apply offset
  if (config.offset && config.offset > 0) {
    result = result.slice(config.offset);
  }

  // Apply limit
  if (config.limit && config.limit > 0) {
    result = result.slice(0, config.limit);
  }

  return result;
}

/**
 * Query builder for constructing queries fluently
 */
export class QueryBuilder {
  private config: QueryConfig = {};
  private objects: SkelenoteObject[];

  constructor(objects: SkelenoteObject[]) {
    this.objects = objects;
    this.config.filters = [];
  }

  /**
   * Add a filter condition
   */
  where(
    field: string,
    operator: FilterOperator,
    value?: PropertyValue | PropertyValue[]
  ): this {
    this.config.filters!.push({ field, operator, value });
    return this;
  }

  /**
   * Shorthand for equals filter
   */
  whereEquals(field: string, value: PropertyValue): this {
    return this.where(field, 'eq', value);
  }

  /**
   * Shorthand for type filter
   */
  ofType(typeId: string): this {
    return this.whereEquals('typeId', typeId);
  }

  /**
   * Shorthand for inboxed filter
   */
  inboxed(value = true): this {
    return this.whereEquals('inboxed', value);
  }

  /**
   * Shorthand for archived filter
   */
  archived(value = true): this {
    return this.whereEquals('archived', value);
  }

  /**
   * Set sort configuration
   */
  sortBy(field: string, direction: SortDirection = 'asc'): this {
    this.config.sort = { field, direction };
    return this;
  }

  /**
   * Sort by creation date
   */
  sortByCreated(direction: SortDirection = 'desc'): this {
    return this.sortBy('createdAt', direction);
  }

  /**
   * Sort by update date
   */
  sortByUpdated(direction: SortDirection = 'desc'): this {
    return this.sortBy('updatedAt', direction);
  }

  /**
   * Set limit
   */
  limit(count: number): this {
    this.config.limit = count;
    return this;
  }

  /**
   * Set offset
   */
  offset(count: number): this {
    this.config.offset = count;
    return this;
  }

  /**
   * Execute the query and return results
   */
  execute(): SkelenoteObject[] {
    return executeQuery(this.objects, this.config);
  }

  /**
   * Get the first result or undefined
   */
  first(): SkelenoteObject | undefined {
    return this.limit(1).execute()[0];
  }

  /**
   * Get count of matching objects
   */
  count(): number {
    // Execute without limit/offset for count
    const countConfig = { filters: this.config.filters };
    return executeQuery(this.objects, countConfig).length;
  }
}

/**
 * Create a query builder for objects
 */
export function query(objects: SkelenoteObject[]): QueryBuilder {
  return new QueryBuilder(objects);
}
