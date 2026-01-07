/**
 * CRUD operations for saved views using Loro CRDT
 */

import type { LoroDoc } from 'loro-crdt';
import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
} from '../types';
import { createSavedView } from '../types';
import {
  getViewsMap,
  serializeSavedView,
  deserializeSavedView,
} from './schema';

/**
 * Error thrown when a view is not found
 */
export class ViewNotFoundError extends Error {
  constructor(id: string) {
    super(`View with ID "${id}" not found`);
    this.name = 'ViewNotFoundError';
  }
}

/**
 * ViewStore provides CRUD operations for saved views
 */
export class ViewStore {
  private doc: LoroDoc;

  constructor(doc: LoroDoc) {
    this.doc = doc;
  }

  /**
   * Create a new saved view
   */
  create(input: CreateSavedViewInput): SavedView {
    const view = createSavedView(input);

    // Store in Loro
    const viewsMap = getViewsMap(this.doc);
    viewsMap.set(view.id, serializeSavedView(view));

    return view;
  }

  /**
   * Get a view by ID
   */
  get(id: string): SavedView | undefined {
    const viewsMap = getViewsMap(this.doc);
    const data = viewsMap.get(id);

    if (data === undefined || data === null || typeof data !== 'string') {
      return undefined;
    }

    return deserializeSavedView(data);
  }

  /**
   * Get a view by ID, throwing if not found
   */
  getOrThrow(id: string): SavedView {
    const view = this.get(id);
    if (!view) {
      throw new ViewNotFoundError(id);
    }
    return view;
  }

  /**
   * Get all saved views
   */
  getAll(): SavedView[] {
    const viewsMap = getViewsMap(this.doc);
    const views: SavedView[] = [];

    // Iterate over all entries in the map
    const entries = viewsMap.toJSON() as Record<string, string>;
    for (const data of Object.values(entries)) {
      if (typeof data === 'string') {
        try {
          views.push(deserializeSavedView(data));
        } catch {
          // Skip malformed entries
        }
      }
    }

    // Sort by creation date (newest first)
    return views.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Update an existing saved view
   */
  update(id: string, input: UpdateSavedViewInput): SavedView {
    const view = this.getOrThrow(id);

    // Create updated view
    const updated: SavedView = {
      ...view,
      name: input.name ?? view.name,
      filters: input.filters ?? view.filters,
      sort: input.sort !== undefined ? input.sort : view.sort,
      typeFilter:
        input.typeFilter !== undefined ? input.typeFilter : view.typeFilter,
      icon: input.icon !== undefined ? input.icon : view.icon,
      updatedAt: Date.now(),
    };

    // Store updated view
    const viewsMap = getViewsMap(this.doc);
    viewsMap.set(id, serializeSavedView(updated));

    return updated;
  }

  /**
   * Delete a saved view
   */
  delete(id: string): boolean {
    const viewsMap = getViewsMap(this.doc);
    const exists = viewsMap.get(id) !== undefined;

    if (exists) {
      viewsMap.delete(id);
    }

    return exists;
  }

  /**
   * Check if a view exists
   */
  exists(id: string): boolean {
    const viewsMap = getViewsMap(this.doc);
    return viewsMap.get(id) !== undefined;
  }

  /**
   * Get the count of saved views
   */
  count(): number {
    return this.getAll().length;
  }
}

/**
 * Create a new ViewStore
 */
export function createViewStore(doc: LoroDoc): ViewStore {
  return new ViewStore(doc);
}
