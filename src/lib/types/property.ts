/**
 * Property type definitions for the Ephemera object model
 */

/**
 * All supported property types
 */
export type PropertyType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'relation'
  | 'url'
  | 'email'
  | 'phone'
  | 'file';

/**
 * Property value types that can be stored
 */
export type PropertyValue =
  | string
  | number
  | boolean
  | string[] // object IDs for relations
  | null;

/**
 * Configuration options for specific property types
 */
export interface PropertyConfig {
  /** Options for select type properties */
  options?: string[];
  /** Target type IDs for relation properties (if empty, any type allowed) */
  targetTypeIds?: string[];
  /** Whether to include time selection for date properties */
  showTime?: boolean;
}

/**
 * Definition of a property within a type schema
 */
export interface PropertyDefinition {
  /** Unique identifier for this property within the type */
  id: string;
  /** Display name of the property */
  name: string;
  /** The data type of this property */
  type: PropertyType;
  /** Whether this property must have a value */
  required: boolean;
  /** Whether this property can hold multiple values (for relations) */
  multiple: boolean;
  /** Additional configuration for specific property types */
  config?: PropertyConfig;
}

/**
 * Type guard to check if a value is a valid PropertyValue
 */
export function isPropertyValue(value: unknown): value is PropertyValue {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === 'string');
  }
  return false;
}

/**
 * Validates a property value against its definition
 */
export function validatePropertyValue(
  value: PropertyValue,
  definition: PropertyDefinition
): { valid: boolean; error?: string } {
  // Check required
  if (definition.required && (value === null || value === undefined)) {
    return { valid: false, error: `Property "${definition.name}" is required` };
  }

  // Null is valid for optional properties
  if (value === null) {
    return { valid: true };
  }

  // Type-specific validation
  switch (definition.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'file':
      if (typeof value !== 'string') {
        return { valid: false, error: `Property "${definition.name}" must be a string` };
      }
      break;

    case 'number':
      if (typeof value !== 'number') {
        return { valid: false, error: `Property "${definition.name}" must be a number` };
      }
      break;

    case 'date':
      if (typeof value !== 'number') {
        return { valid: false, error: `Property "${definition.name}" must be a timestamp (number)` };
      }
      break;

    case 'checkbox':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `Property "${definition.name}" must be a boolean` };
      }
      break;

    case 'select':
      if (typeof value !== 'string') {
        return { valid: false, error: `Property "${definition.name}" must be a string` };
      }
      if (definition.config?.options && !definition.config.options.includes(value)) {
        return {
          valid: false,
          error: `Property "${definition.name}" must be one of: ${definition.config.options.join(', ')}`,
        };
      }
      break;

    case 'relation':
      if (!Array.isArray(value)) {
        return { valid: false, error: `Property "${definition.name}" must be an array of IDs` };
      }
      if (!definition.multiple && value.length > 1) {
        return { valid: false, error: `Property "${definition.name}" can only have one relation` };
      }
      if (!value.every((v) => typeof v === 'string')) {
        return { valid: false, error: `Property "${definition.name}" must contain only string IDs` };
      }
      break;
  }

  return { valid: true };
}
