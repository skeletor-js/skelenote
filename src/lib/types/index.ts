/**
 * Type definitions for skelenote object model
 */

// Property types
export type {
  PropertyType,
  PropertyValue,
  PropertyConfig,
  PropertyDefinition,
} from './property';
export { isPropertyValue, validatePropertyValue } from './property';

// Type definitions
export type {
  TypeDefinition,
  TypeRegistry,
  BuiltInTypeId,
} from './type-definition';
export { BuiltInTypeIds, createTypeRegistry } from './type-definition';

// Object types
export type {
  SkelenoteObject,
  CreateObjectInput,
  UpdateObjectInput,
} from './object';
export { generateId, createObject, isSkelenoteObject } from './object';

// Built-in types
export {
  TaskType,
  NoteType,
  ProjectType,
  LinkType,
  MeetingType,
  TagType,
  builtInTypes,
  getBuiltInType,
  TaskStatusOptions,
  TaskPriorityOptions,
  ProjectStatusOptions,
  MeetingDurationOptions,
} from './built-in-types';
export type {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  MeetingDuration,
} from './built-in-types';

// Saved views
export type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
} from './saved-view';
export { generateViewId, createSavedView, isSavedView } from './saved-view';
