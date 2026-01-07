/**
 * Hook for template operations
 */

import { useMemo, useCallback, useState } from 'react';
import { useObjects } from '@/contexts';
import { useNavigation } from '@/contexts/NavigationContext';
import type { PropertyValue } from '@/lib/types';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  PlaceholderContext,
} from '@/lib/templates';
import {
  getTemplates,
  getTemplatesForType,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  createFromTemplate,
  getDailyNoteTemplate,
  setDailyNoteTemplate,
  clearDailyNoteTemplate,
} from '@/lib/templates';

export interface UseTemplatesResult {
  /** All templates sorted by name */
  templates: Template[];
  /** Whether the data is still loading */
  isLoading: boolean;
  /** Number of templates */
  count: number;
  /** Get templates for a specific target type */
  getForType: (targetTypeId: string) => Template[];
  /** Get a single template by ID */
  getById: (templateId: string) => Template | undefined;
  /** Create a new template */
  create: (input: CreateTemplateInput) => Template | null;
  /** Update an existing template */
  update: (templateId: string, input: UpdateTemplateInput) => Template | null;
  /** Delete a template */
  remove: (templateId: string) => boolean;
  /** Duplicate a template */
  duplicate: (templateId: string) => Template | null;
  /** Create an object from a template and optionally navigate to it */
  createObject: (
    templateId: string,
    options?: {
      properties?: Record<string, PropertyValue>;
      title?: string;
      context?: PlaceholderContext;
      navigate?: boolean;
    }
  ) => string | null;
  /** Get the currently configured daily note template */
  dailyNoteTemplate: Template | null;
  /** Set the daily note template */
  setDailyNoteTemplate: (templateId: string | null) => void;
}

/**
 * Hook for managing templates
 *
 * @example
 * ```tsx
 * const { templates, createObject, create } = useTemplates();
 *
 * // Create an object from a template
 * const objectId = createObject(templateId, { navigate: true });
 *
 * // Create a new template
 * const newTemplate = create({
 *   name: 'Meeting Notes',
 *   targetTypeId: 'note',
 *   defaultProperties: { title: 'Meeting: {{date}}' }
 * });
 * ```
 */
export function useTemplates(): UseTemplatesResult {
  const { store, isLoading, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();

  // Force re-render when daily note template changes
  const [, setForceUpdate] = useState(0);

  // Get all templates, sorted by name
  const templates = useMemo(() => {
    if (!store) return [];
    return getTemplates(store);
  }, [store]);

  // Get the daily note template
  const dailyNoteTemplate = useMemo(() => {
    if (!store) return null;
    return getDailyNoteTemplate(store);
  }, [store]);

  // Get templates for a specific type
  const getForType = useCallback(
    (targetTypeId: string): Template[] => {
      if (!store) return [];
      return getTemplatesForType(store, targetTypeId);
    },
    [store]
  );

  // Get a single template by ID
  const getById = useCallback(
    (templateId: string): Template | undefined => {
      if (!store) return undefined;
      return getTemplate(store, templateId);
    },
    [store]
  );

  // Create a new template
  const create = useCallback(
    (input: CreateTemplateInput): Template | null => {
      if (!store) return null;
      try {
        const template = createTemplate(store, input);
        refreshData();
        return template;
      } catch (error) {
        console.error('Failed to create template:', error);
        return null;
      }
    },
    [store, refreshData]
  );

  // Update an existing template
  const update = useCallback(
    (templateId: string, input: UpdateTemplateInput): Template | null => {
      if (!store) return null;
      try {
        const template = updateTemplate(store, templateId, input);
        refreshData();
        return template;
      } catch (error) {
        console.error('Failed to update template:', error);
        return null;
      }
    },
    [store, refreshData]
  );

  // Delete a template
  const remove = useCallback(
    (templateId: string): boolean => {
      if (!store) return false;
      try {
        const success = deleteTemplate(store, templateId);
        if (success) {
          refreshData();
        }
        return success;
      } catch (error) {
        console.error('Failed to delete template:', error);
        return false;
      }
    },
    [store, refreshData]
  );

  // Duplicate a template
  const duplicateFn = useCallback(
    (templateId: string): Template | null => {
      if (!store) return null;
      try {
        const template = duplicateTemplate(store, templateId);
        refreshData();
        return template;
      } catch (error) {
        console.error('Failed to duplicate template:', error);
        return null;
      }
    },
    [store, refreshData]
  );

  // Create an object from a template
  const createObject = useCallback(
    (
      templateId: string,
      options?: {
        properties?: Record<string, PropertyValue>;
        title?: string;
        context?: PlaceholderContext;
        navigate?: boolean;
      }
    ): string | null => {
      if (!store) {
        return null;
      }
      try {
        const result = createFromTemplate(store, templateId, {
          properties: options?.properties,
          title: options?.title,
          context: options?.context,
        });
        refreshData();

        // Optionally navigate to the new object
        if (options?.navigate) {
          navigateToObject(result.objectId);
        }

        return result.objectId;
      } catch (error) {
        console.error('Failed to create object from template:', error);
        return null;
      }
    },
    [store, refreshData, navigateToObject]
  );

  // Set the daily note template
  const setDailyNoteTemplateFn = useCallback((templateId: string | null) => {
    if (templateId) {
      setDailyNoteTemplate(templateId);
    } else {
      clearDailyNoteTemplate();
    }
    // Force re-render to update dailyNoteTemplate
    setForceUpdate((n) => n + 1);
  }, []);

  return {
    templates,
    isLoading,
    count: templates.length,
    getForType,
    getById,
    create,
    update,
    remove,
    duplicate: duplicateFn,
    createObject,
    dailyNoteTemplate,
    setDailyNoteTemplate: setDailyNoteTemplateFn,
  };
}
