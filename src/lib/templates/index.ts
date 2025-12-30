/**
 * Templates module - reusable object blueprints
 */

// Types
export type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateFromTemplateResult,
  PlaceholderType,
  PlaceholderContext,
  PlaceholderDefinition,
} from './types';
export { TemplatePropertyIds, PLACEHOLDERS } from './types';

// Placeholder utilities
export {
  expandPlaceholders,
  expandPlaceholdersInContent,
  extractPlaceholders,
  getPlaceholderValue,
  isValidPlaceholder,
  createDefaultContext,
} from './placeholders';

// Template manager
export {
  TEMPLATE_TYPE_ID,
  parseTemplate,
  isTemplate,
  getTemplates,
  getTemplatesForType,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  createFromTemplate,
  getDailyNoteTemplateId,
  setDailyNoteTemplate,
  clearDailyNoteTemplate,
  getDailyNoteTemplate,
  applyDailyNoteTemplate,
  getDailyNoteTemplates,
} from './manager';
