/**
 * Template manager for CRUD operations and object creation from templates
 */

import type { ObjectStore } from '../loro/objects';
import type { SkelenoteObject, PropertyValue } from '../types';
import { BuiltInTypeIds } from '../types';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateFromTemplateResult,
  PlaceholderContext,
} from './types';
import { TemplatePropertyIds } from './types';
import { expandPlaceholders, expandPlaceholdersInContent, createDefaultContext } from './placeholders';

/**
 * Template type ID - added to BuiltInTypeIds
 */
export const TEMPLATE_TYPE_ID = 'template';

/**
 * Local storage key for daily note template preference
 */
const DAILY_NOTE_TEMPLATE_KEY = 'skelenote:dailyNoteTemplateId';

/**
 * Parse a template object into the Template interface
 */
export function parseTemplate(obj: SkelenoteObject): Template {
  const props = obj.properties;

  // Parse JSON-encoded default properties
  let defaultProperties: Record<string, PropertyValue> = {};
  const templatePropsJson = props[TemplatePropertyIds.TEMPLATE_PROPERTIES];
  if (typeof templatePropsJson === 'string' && templatePropsJson) {
    try {
      defaultProperties = JSON.parse(templatePropsJson);
    } catch {
      // Invalid JSON, use empty object
    }
  }

  return {
    id: obj.id,
    name: (props[TemplatePropertyIds.TITLE] as string) ?? 'Untitled Template',
    description: (props[TemplatePropertyIds.DESCRIPTION] as string) ?? undefined,
    targetTypeId: (props[TemplatePropertyIds.TARGET_TYPE_ID] as string) ?? BuiltInTypeIds.NOTE,
    defaultProperties,
    isDailyNoteTemplate: props[TemplatePropertyIds.IS_DAILY_NOTE_TEMPLATE] === true,
    hasContent: obj.hasContent,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Check if an object is a template
 */
export function isTemplate(obj: SkelenoteObject): boolean {
  return obj.typeId === TEMPLATE_TYPE_ID;
}

/**
 * Get all templates from the store
 */
export function getTemplates(store: ObjectStore): Template[] {
  return store
    .getByType(TEMPLATE_TYPE_ID)
    .map(parseTemplate)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get templates filtered by target type
 */
export function getTemplatesForType(store: ObjectStore, targetTypeId: string): Template[] {
  return getTemplates(store).filter((t) => t.targetTypeId === targetTypeId);
}

/**
 * Get a single template by ID
 */
export function getTemplate(store: ObjectStore, templateId: string): Template | undefined {
  const obj = store.get(templateId);
  if (!obj || !isTemplate(obj)) {
    return undefined;
  }
  return parseTemplate(obj);
}

/**
 * Create a new template
 */
export function createTemplate(store: ObjectStore, input: CreateTemplateInput): Template {
  const templateProps: Record<string, PropertyValue> = {
    [TemplatePropertyIds.TITLE]: input.name,
    [TemplatePropertyIds.TARGET_TYPE_ID]: input.targetTypeId,
    [TemplatePropertyIds.IS_DAILY_NOTE_TEMPLATE]: input.isDailyNoteTemplate ?? false,
    [TemplatePropertyIds.TEMPLATE_PROPERTIES]: JSON.stringify(input.defaultProperties ?? {}),
  };

  if (input.description) {
    templateProps[TemplatePropertyIds.DESCRIPTION] = input.description;
  }

  const obj = store.create({
    typeId: TEMPLATE_TYPE_ID,
    properties: templateProps,
    withContent: true, // Templates always have content for the template body
    inboxed: false, // Templates don't go to inbox
  });

  // Set initial content if provided
  if (input.content) {
    store.setContent(obj.id, input.content);
  }

  return parseTemplate(obj);
}

/**
 * Update an existing template
 */
export function updateTemplate(
  store: ObjectStore,
  templateId: string,
  input: UpdateTemplateInput
): Template {
  const obj = store.get(templateId);
  if (!obj || !isTemplate(obj)) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const updates: Record<string, PropertyValue> = {};

  if (input.name !== undefined) {
    updates[TemplatePropertyIds.TITLE] = input.name;
  }
  if (input.description !== undefined) {
    updates[TemplatePropertyIds.DESCRIPTION] = input.description;
  }
  if (input.targetTypeId !== undefined) {
    updates[TemplatePropertyIds.TARGET_TYPE_ID] = input.targetTypeId;
  }
  if (input.isDailyNoteTemplate !== undefined) {
    updates[TemplatePropertyIds.IS_DAILY_NOTE_TEMPLATE] = input.isDailyNoteTemplate;
  }
  if (input.defaultProperties !== undefined) {
    updates[TemplatePropertyIds.TEMPLATE_PROPERTIES] = JSON.stringify(input.defaultProperties);
  }

  const updated = store.update(templateId, { properties: updates });
  return parseTemplate(updated);
}

/**
 * Delete a template
 */
export function deleteTemplate(store: ObjectStore, templateId: string): boolean {
  const obj = store.get(templateId);
  if (!obj || !isTemplate(obj)) {
    return false;
  }

  // Clear daily note template preference if this was the daily note template
  const dailyNoteTemplateId = getDailyNoteTemplateId();
  if (dailyNoteTemplateId === templateId) {
    clearDailyNoteTemplate();
  }

  return store.delete(templateId);
}

/**
 * Duplicate a template
 */
export function duplicateTemplate(store: ObjectStore, templateId: string): Template {
  const template = getTemplate(store, templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Get the original content
  const originalObj = store.get(templateId);
  const content = originalObj ? store.getContent(originalObj.id) : '';

  return createTemplate(store, {
    name: `${template.name} (Copy)`,
    description: template.description,
    targetTypeId: template.targetTypeId,
    defaultProperties: { ...template.defaultProperties },
    isDailyNoteTemplate: false, // Don't duplicate daily note template flag
    content,
  });
}

/**
 * Create a new object from a template
 */
export function createFromTemplate(
  store: ObjectStore,
  templateId: string,
  overrides?: {
    properties?: Record<string, PropertyValue>;
    title?: string;
    context?: PlaceholderContext;
  }
): CreateFromTemplateResult {
  const template = getTemplate(store, templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Build the placeholder context
  const context: PlaceholderContext = overrides?.context ?? createDefaultContext(overrides?.title);
  if (overrides?.title) {
    context.title = overrides.title;
  }

  // Merge template default properties with overrides
  const appliedProperties: Record<string, PropertyValue> = {};

  // First, apply template defaults with placeholder expansion
  for (const [key, value] of Object.entries(template.defaultProperties)) {
    if (typeof value === 'string') {
      appliedProperties[key] = expandPlaceholders(value, context);
    } else {
      appliedProperties[key] = value;
    }
  }

  // Then, apply overrides (these take precedence)
  if (overrides?.properties) {
    for (const [key, value] of Object.entries(overrides.properties)) {
      appliedProperties[key] = value;
    }
  }

  // Create the object with the target type
  const obj = store.create({
    typeId: template.targetTypeId,
    properties: appliedProperties,
    withContent: true,
    inboxed: true, // Objects from templates go to inbox by default
  });

  // Apply template content if it exists
  let contentApplied = false;
  if (template.hasContent) {
    const templateObj = store.get(templateId);
    if (templateObj) {
      const templateContent = store.getContent(templateObj.id);
      if (templateContent) {
        // Expand placeholders in content
        const expandedContent = expandPlaceholdersInContent(templateContent, context);
        store.setContent(obj.id, expandedContent);
        contentApplied = true;
      }
    }
  }

  return {
    objectId: obj.id,
    appliedProperties,
    contentApplied,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Note Template Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the ID of the configured daily note template
 */
export function getDailyNoteTemplateId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DAILY_NOTE_TEMPLATE_KEY);
}

/**
 * Set the daily note template
 */
export function setDailyNoteTemplate(templateId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAILY_NOTE_TEMPLATE_KEY, templateId);
}

/**
 * Clear the daily note template preference
 */
export function clearDailyNoteTemplate(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DAILY_NOTE_TEMPLATE_KEY);
}

/**
 * Get the daily note template (if configured and exists)
 */
export function getDailyNoteTemplate(store: ObjectStore): Template | null {
  const templateId = getDailyNoteTemplateId();
  if (!templateId) return null;

  const template = getTemplate(store, templateId);
  if (!template) {
    // Template was deleted, clear the preference
    clearDailyNoteTemplate();
    return null;
  }

  return template;
}

/**
 * Apply daily note template content to a daily note
 * Returns true if content was applied, false otherwise
 */
export function applyDailyNoteTemplate(
  store: ObjectStore,
  dailyNoteId: string,
  date: Date
): boolean {
  const template = getDailyNoteTemplate(store);
  if (!template || !template.hasContent) {
    return false;
  }

  const templateObj = store.get(template.id);
  if (!templateObj) return false;

  const templateContent = store.getContent(templateObj.id);
  if (!templateContent) return false;

  // Build context for placeholder expansion
  const dailyNote = store.get(dailyNoteId);
  const title = dailyNote?.properties.title as string | undefined;

  const context: PlaceholderContext = {
    date,
    title,
  };

  // Expand placeholders and set content
  const expandedContent = expandPlaceholdersInContent(templateContent, context);
  store.setContent(dailyNoteId, expandedContent);

  return true;
}

/**
 * Get templates that are marked as daily note templates
 */
export function getDailyNoteTemplates(store: ObjectStore): Template[] {
  return getTemplates(store).filter((t) => t.isDailyNoteTemplate);
}
