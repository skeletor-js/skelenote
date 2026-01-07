/**
 * YAML frontmatter generator for Markdown export
 */

import type { ExportContext, FrontmatterProperty } from './types';
import type { PropertyValue, PropertyDefinition } from '../types';

/**
 * Convert a property name to kebab-case for YAML keys
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Format a date timestamp as ISO date string
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Escape a string for YAML output
 */
function escapeYamlString(str: string): string {
  // If string contains special characters, wrap in quotes
  if (/[:#{}[\],&*!|>'"%@`]/.test(str) || str.includes('\n')) {
    // Escape double quotes and wrap
    return `"${str.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return str;
}

/**
 * Convert a property value to YAML-compatible format
 */
function convertPropertyValue(
  value: PropertyValue,
  definition: PropertyDefinition,
  resolveObjectName: (id: string) => string | undefined
): string | number | boolean | string[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (definition.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'select':
      return String(value);

    case 'number':
      return typeof value === 'number' ? value : Number(value);

    case 'date':
      if (typeof value === 'number') {
        return formatDate(value);
      }
      return null;

    case 'checkbox':
      return Boolean(value);

    case 'relation':
      if (Array.isArray(value)) {
        // Resolve each relation ID to its object name
        const names = value
          .map((id) => resolveObjectName(id))
          .filter((name): name is string => name !== undefined);
        return names.length > 0 ? names : null;
      }
      return null;

    case 'recurrence':
      // Skip recurrence in frontmatter as it's complex JSON
      return null;

    case 'file':
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Generate frontmatter properties from an object
 */
export function generateFrontmatterProperties(
  context: ExportContext
): FrontmatterProperty[] {
  const { object, typeDef, resolveObjectName } = context;
  const properties: FrontmatterProperty[] = [];

  // Add title/name first
  const titlePropId = object.properties.title !== undefined ? 'title' : 'name';
  const titleValue = object.properties[titlePropId];
  if (titleValue) {
    properties.push({
      key: 'title',
      value: String(titleValue),
      definition: typeDef.schema.find((p) => p.id === titlePropId) || {
        id: titlePropId,
        name: 'Title',
        type: 'text',
        required: true,
        multiple: false,
      },
    });
  }

  // Add type
  properties.push({
    key: 'type',
    value: typeDef.name.toLowerCase(),
    definition: {
      id: '_type',
      name: 'Type',
      type: 'text',
      required: false,
      multiple: false,
    },
  });

  // Add created/updated timestamps
  properties.push({
    key: 'created',
    value: formatDate(object.createdAt),
    definition: {
      id: '_created',
      name: 'Created',
      type: 'date',
      required: false,
      multiple: false,
    },
  });

  properties.push({
    key: 'updated',
    value: formatDate(object.updatedAt),
    definition: {
      id: '_updated',
      name: 'Updated',
      type: 'date',
      required: false,
      multiple: false,
    },
  });

  // Add schema properties (excluding title/name and hidden properties)
  for (const propDef of typeDef.schema) {
    // Skip title/name (already added), hidden properties, and recurrence
    if (
      propDef.id === titlePropId ||
      propDef.hidden ||
      propDef.type === 'recurrence'
    ) {
      continue;
    }

    const value = object.properties[propDef.id];
    const convertedValue = convertPropertyValue(
      value,
      propDef,
      resolveObjectName
    );

    if (convertedValue !== null) {
      properties.push({
        key: toKebabCase(propDef.name),
        value: convertedValue,
        definition: propDef,
      });
    }
  }

  return properties;
}

/**
 * Render frontmatter properties to YAML string
 */
export function renderFrontmatter(properties: FrontmatterProperty[]): string {
  const lines: string[] = ['---'];

  for (const prop of properties) {
    if (prop.value === null) continue;

    if (Array.isArray(prop.value)) {
      // Multi-value property (like tags)
      lines.push(`${prop.key}:`);
      for (const item of prop.value) {
        lines.push(`  - ${escapeYamlString(String(item))}`);
      }
    } else if (typeof prop.value === 'string') {
      lines.push(`${prop.key}: ${escapeYamlString(prop.value)}`);
    } else if (typeof prop.value === 'boolean') {
      lines.push(`${prop.key}: ${prop.value}`);
    } else if (typeof prop.value === 'number') {
      lines.push(`${prop.key}: ${prop.value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate complete YAML frontmatter for an object
 */
export function generateFrontmatter(context: ExportContext): string {
  const properties = generateFrontmatterProperties(context);
  return renderFrontmatter(properties);
}
