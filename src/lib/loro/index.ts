/**
 * Loro CRDT storage layer for skelenote
 */

// Store
export { LoroDocStore } from './store';

// Schema
export {
  OBJECTS_MAP_KEY,
  TYPES_MAP_KEY,
  VIEWS_MAP_KEY,
  CONTENT_PREFIX,
  getContentKey,
  getObjectsMap,
  getTypesMap,
  getViewsMap,
  getContentText,
  serializeObject,
  deserializeObject,
  serializeType,
  deserializeType,
  serializeSavedView,
  deserializeSavedView,
  SCHEMA_VERSION,
  initializeDocument,
  getSchemaVersion,
} from './schema';

// Objects (CRUD)
export {
  ObjectStore,
  ObjectNotFoundError,
  ValidationError,
  createObjectStore,
} from './objects';

// Views (CRUD)
export { ViewStore, ViewNotFoundError, createViewStore } from './views';

// Relations
export type { Backlink } from './relations';
export {
  getRelationIds,
  isRelationProperty,
  getRelationProperties,
  RelationHelper,
  createRelationHelper,
} from './relations';

// Backlink Index
export { BacklinkIndex, createBacklinkIndex } from './backlink-index';

// Queries
export type {
  SortDirection,
  SortConfig,
  FilterOperator,
  FilterCondition,
  QueryConfig,
} from './queries';
export { executeQuery, QueryBuilder, query } from './queries';

// Version History (Time Machine)
export type { ChangePoint, DayChanges, VersionHistory } from './versions';
export {
  extractChangePoints,
  findFrontierAt,
  aggregateByDate,
  getVersionHistory,
  getDaysWithChanges,
  getChangesForDate,
  resolveDeviceInfo,
  enrichWithDeviceInfo,
} from './versions';
