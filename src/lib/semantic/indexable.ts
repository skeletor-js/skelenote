/**
 * Indexable Content Utilities
 *
 * Shared utilities for extracting indexable content from objects.
 * Used by both SemanticSettings (manual rebuild) and useSemanticIndexSync (auto-sync).
 */

import type { ObjectStore } from '@/lib/loro';
import type { TypeRegistry } from '@/lib/types';
import type { IndexableContent } from './engine';

/**
 * Extract plain text from BlockNote blocks.
 */
export function extractPlainText(blocks: unknown[]): string {
  const texts: string[] = [];

  function processBlock(block: unknown) {
    if (!block || typeof block !== 'object') return;

    const b = block as Record<string, unknown>;

    // Extract text content
    if (b.content && Array.isArray(b.content)) {
      for (const item of b.content) {
        if (item && typeof item === 'object') {
          const c = item as Record<string, unknown>;
          if (c.type === 'text' && typeof c.text === 'string') {
            texts.push(c.text);
          } else if (c.type === 'link' && typeof c.text === 'string') {
            texts.push(c.text);
          }
        }
      }
    }

    // Process children
    if (b.children && Array.isArray(b.children)) {
      for (const child of b.children) {
        processBlock(child);
      }
    }
  }

  for (const block of blocks) {
    processBlock(block);
  }

  return texts.join(' ');
}

/**
 * Get indexable content for a single object.
 * Returns null if object doesn't exist.
 */
export function getIndexableContentForObject(
  objectId: string,
  store: ObjectStore,
  typeRegistry: TypeRegistry
): IndexableContent | null {
  const obj = store.get(objectId);
  if (!obj) return null;

  // Get title from properties
  const titleProp = obj.properties.title ?? obj.properties.name;
  const title = typeof titleProp === 'string' ? titleProp : obj.id;

  // Get content if object has content
  let content = '';
  if (obj.hasContent) {
    const rawContent = store.getContent(obj.id);
    if (rawContent) {
      // Extract plain text from BlockNote content
      try {
        const blocks = JSON.parse(rawContent);
        content = extractPlainText(blocks);
      } catch {
        content = rawContent;
      }
    }
  }

  // Add properties to content for better matching
  const propTexts: string[] = [];
  const typeDef = typeRegistry?.get(obj.typeId);
  if (typeDef?.schema) {
    for (const propDef of typeDef.schema) {
      const value = obj.properties[propDef.id];
      if (value && typeof value === 'string' && propDef.type === 'text') {
        propTexts.push(value);
      }
    }
  }

  return {
    objectId: obj.id,
    title,
    content: [content, ...propTexts].filter(Boolean).join('\n'),
  };
}

/**
 * Get indexable content for all objects.
 */
export function getAllIndexableContent(
  store: ObjectStore,
  typeRegistry: TypeRegistry
): IndexableContent[] {
  const objects = store.getAll();
  const result: IndexableContent[] = [];

  for (const obj of objects) {
    const indexable = getIndexableContentForObject(obj.id, store, typeRegistry);
    if (indexable) {
      result.push(indexable);
    }
  }

  return result;
}
