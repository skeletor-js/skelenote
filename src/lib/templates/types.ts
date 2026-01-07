/**
 * Template types for reusable object blueprints
 */

import type { PropertyValue } from '../types/property';

/**
 * Supported placeholder types for dynamic content expansion
 */
export type PlaceholderType =
  | 'date' // Current date: "December 27, 2025"
  | 'date_short' // Short date: "2025-12-27"
  | 'title' // Object title (from properties)
  | 'time' // Current time: "3:45 PM"
  | 'tomorrow' // Tomorrow's date
  | 'yesterday' // Yesterday's date
  | 'week' // Current week number
  | 'month' // Current month name
  | 'year'; // Current year

/**
 * Context provided when expanding placeholders
 */
export interface PlaceholderContext {
  /** The date to use for date-based placeholders (defaults to now) */
  date: Date;
  /** The title of the object being created */
  title?: string;
  /** Custom values for user-defined placeholders (future use) */
  customValues?: Record<string, string>;
}

/**
 * Placeholder definition with metadata
 */
export interface PlaceholderDefinition {
  /** The placeholder type */
  type: PlaceholderType;
  /** Display label for the placeholder */
  label: string;
  /** Short description */
  description: string;
  /** Example output */
  example: string;
}

/**
 * All available placeholders with their metadata
 */
export const PLACEHOLDERS: PlaceholderDefinition[] = [
  {
    type: 'date',
    label: '{{date}}',
    description: 'Today',
    example: 'December 27, 2025',
  },
  {
    type: 'date_short',
    label: '{{date_short}}',
    description: 'ISO',
    example: '2025-12-27',
  },
  {
    type: 'title',
    label: '{{title}}',
    description: 'Title',
    example: 'Meeting: Q1 Planning',
  },
  { type: 'time', label: '{{time}}', description: 'Time', example: '3:45 PM' },
  {
    type: 'tomorrow',
    label: '{{tomorrow}}',
    description: '+1 day',
    example: 'December 28, 2025',
  },
  {
    type: 'yesterday',
    label: '{{yesterday}}',
    description: '-1 day',
    example: 'December 26, 2025',
  },
  {
    type: 'week',
    label: '{{week}}',
    description: 'Week #',
    example: 'Week 52',
  },
  {
    type: 'month',
    label: '{{month}}',
    description: 'Month',
    example: 'December',
  },
  { type: 'year', label: '{{year}}', description: 'Year', example: '2025' },
];

/**
 * Template property IDs used in template objects
 */
export const TemplatePropertyIds = {
  /** Template display name */
  TITLE: 'title',
  /** Description of what this template creates */
  DESCRIPTION: 'description',
  /** The type ID this template creates objects of */
  TARGET_TYPE_ID: 'targetTypeId',
  /** Whether this template should auto-apply to daily notes */
  IS_DAILY_NOTE_TEMPLATE: 'isDailyNoteTemplate',
  /** JSON-encoded default property values for the target type */
  TEMPLATE_PROPERTIES: 'templateProperties',
} as const;

/**
 * Parsed template data from a template object
 */
export interface Template {
  /** Template object ID */
  id: string;
  /** Template display name */
  name: string;
  /** Optional description */
  description?: string;
  /** The type ID this template creates */
  targetTypeId: string;
  /** Default property values to apply when creating from this template */
  defaultProperties: Record<string, PropertyValue>;
  /** Whether this template auto-applies to daily notes */
  isDailyNoteTemplate: boolean;
  /** Whether the template has content blocks */
  hasContent: boolean;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Input for creating a new template
 */
export interface CreateTemplateInput {
  /** Template display name */
  name: string;
  /** Optional description */
  description?: string;
  /** The type this template creates */
  targetTypeId: string;
  /** Default property values */
  defaultProperties?: Record<string, PropertyValue>;
  /** Whether this is a daily note template */
  isDailyNoteTemplate?: boolean;
  /** Initial content (BlockNote JSON string) */
  content?: string;
}

/**
 * Input for updating an existing template
 */
export interface UpdateTemplateInput {
  /** Template display name */
  name?: string;
  /** Optional description */
  description?: string;
  /** The type this template creates */
  targetTypeId?: string;
  /** Default property values */
  defaultProperties?: Record<string, PropertyValue>;
  /** Whether this is a daily note template */
  isDailyNoteTemplate?: boolean;
}

/**
 * Result of creating an object from a template
 */
export interface CreateFromTemplateResult {
  /** The created object ID */
  objectId: string;
  /** Properties applied from the template */
  appliedProperties: Record<string, PropertyValue>;
  /** Whether content was applied */
  contentApplied: boolean;
}
