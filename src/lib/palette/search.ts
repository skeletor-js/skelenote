/**
 * Search utilities for Command Palette
 */

import type { EphemeraObject, TypeRegistry } from '@/lib/types';
import { fuzzyMatch, type PaletteAction } from './actions';

/**
 * Search objects and return palette actions
 */
export function searchObjects(
  objects: EphemeraObject[],
  query: string,
  typeRegistry: TypeRegistry,
  limit: number = 10
): PaletteAction[] {
  if (!query.trim()) {
    return [];
  }

  const results: PaletteAction[] = [];

  for (const obj of objects) {
    if (results.length >= limit) break;

    // Get title or name
    const name = (obj.properties.title ?? obj.properties.name ?? '') as string;
    if (!name) continue;

    // Check if matches query
    if (!fuzzyMatch(query, name)) continue;

    // Get type info
    const typeDef = typeRegistry.get(obj.typeId);
    const icon = typeDef?.icon ?? '📄';

    results.push({
      id: `object-${obj.id}`,
      label: name,
      icon,
      category: 'object',
      objectId: obj.id,
    });
  }

  return results;
}

/**
 * Sort objects by relevance (most recently updated first)
 */
export function sortByRelevance(objects: EphemeraObject[]): EphemeraObject[] {
  return [...objects].sort((a, b) => b.updatedAt - a.updatedAt);
}
