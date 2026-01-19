/**
 * Analytics Event Constants
 *
 * Defines all tracked events with typed constants.
 * Use snake_case with category prefixes for consistency.
 */

export const AnalyticsEvents = {
  // App lifecycle
  APP_LAUNCHED: 'app_launched',

  // Navigation
  VIEW_OPENED: 'view_opened',
  OBJECT_OPENED: 'object_opened',

  // Object actions
  OBJECT_CREATED: 'object_created',
  OBJECT_ARCHIVED: 'object_archived',
  OBJECT_DELETED: 'object_deleted',
  TASK_COMPLETED: 'task_completed',

  // Features
  SEARCH_PERFORMED: 'search_performed',
  TEMPLATE_USED: 'template_used',
  DAILY_NOTE_CREATED: 'daily_note_created',
  EXPORT_COMPLETED: 'export_completed',
  IMPORT_COMPLETED: 'import_completed',

  // Sync
  SYNC_STARTED: 'sync_started',
  DEVICE_PAIRED: 'device_paired',

  // Settings
  THEME_CHANGED: 'theme_changed',
  SEMANTIC_SEARCH_ENABLED: 'semantic_search_enabled',
  SEMANTIC_SEARCH_DISABLED: 'semantic_search_disabled',

  // Errors (for debugging, no PII)
  ERROR_OCCURRED: 'error_occurred',
} as const;

export type AnalyticsEvent =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
