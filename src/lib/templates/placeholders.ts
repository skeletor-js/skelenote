/**
 * Placeholder expansion system for templates
 *
 * Handles parsing and expanding {{placeholder}} syntax in template content
 * and property values.
 */

import type { PlaceholderContext, PlaceholderType } from './types';

/**
 * Regex pattern to match placeholders: {{placeholder_name}}
 */
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Format a date in long format (e.g., "December 27, 2025")
 */
function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date in ISO format (e.g., "2025-12-27")
 */
function formatDateShort(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time (e.g., "3:45 PM")
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the expanded value for a placeholder type
 */
export function getPlaceholderValue(
  type: PlaceholderType,
  context: PlaceholderContext
): string {
  const { date, title, customValues } = context;

  switch (type) {
    case 'date':
      return formatDateLong(date);

    case 'date_short':
      return formatDateShort(date);

    case 'title':
      return title ?? '';

    case 'time':
      return formatTime(date);

    case 'tomorrow':
      return formatDateLong(addDays(date, 1));

    case 'yesterday':
      return formatDateLong(addDays(date, -1));

    case 'week':
      return `Week ${getWeekNumber(date)}`;

    case 'month':
      return date.toLocaleDateString('en-US', { month: 'long' });

    case 'year':
      return String(date.getFullYear());

    default:
      // Check custom values for unknown placeholders
      if (customValues && type in customValues) {
        return customValues[type];
      }
      // Return the original placeholder if unknown
      return `{{${type}}}`;
  }
}

/**
 * Check if a string is a valid placeholder type
 */
export function isValidPlaceholder(name: string): name is PlaceholderType {
  const validTypes: PlaceholderType[] = [
    'date',
    'date_short',
    'title',
    'time',
    'tomorrow',
    'yesterday',
    'week',
    'month',
    'year',
  ];
  return validTypes.includes(name as PlaceholderType);
}

/**
 * Expand all placeholders in a string
 *
 * @param text - The text containing placeholders
 * @param context - The context for placeholder expansion
 * @returns The text with all placeholders expanded
 */
export function expandPlaceholders(
  text: string,
  context: PlaceholderContext
): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, name) => {
    if (isValidPlaceholder(name)) {
      return getPlaceholderValue(name, context);
    }
    // Check custom values
    if (context.customValues && name in context.customValues) {
      return context.customValues[name];
    }
    // Leave unknown placeholders as-is
    return match;
  });
}

/**
 * Expand placeholders in BlockNote content JSON
 *
 * This recursively traverses the BlockNote content structure and expands
 * placeholders in text nodes.
 *
 * @param content - BlockNote content as JSON string or parsed object
 * @param context - The context for placeholder expansion
 * @returns The content with all placeholders expanded
 */
export function expandPlaceholdersInContent(
  content: string | unknown,
  context: PlaceholderContext
): string {
  // Parse if string
  let parsed: unknown;
  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
      // Verify it's valid BlockNote format (array of blocks)
      if (!Array.isArray(parsed)) {
        throw new Error('Not an array');
      }
    } catch {
      // If not valid JSON or not BlockNote format, convert plain text to BlockNote first
      const expanded = expandPlaceholders(content, context);
      return textToBlockNoteJson(expanded);
    }
  } else {
    parsed = content;
  }

  // Recursively process the content
  const processed = processContentNode(parsed, context);

  // Return as JSON string
  return JSON.stringify(processed);
}

/**
 * Recursively process a content node, expanding placeholders in text
 */
function processContentNode(
  node: unknown,
  context: PlaceholderContext
): unknown {
  if (node === null || node === undefined) {
    return node;
  }

  if (typeof node === 'string') {
    return expandPlaceholders(node, context);
  }

  if (Array.isArray(node)) {
    return node.map((item) => processContentNode(item, context));
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Expand placeholders in text content fields
      if (key === 'text' && typeof value === 'string') {
        result[key] = expandPlaceholders(value, context);
      } else {
        result[key] = processContentNode(value, context);
      }
    }

    return result;
  }

  return node;
}

/**
 * Extract all placeholders from a string
 *
 * @param text - The text to scan for placeholders
 * @returns Array of placeholder names found
 */
export function extractPlaceholders(text: string): string[] {
  const placeholders: string[] = [];
  let match;

  // Reset regex state
  PLACEHOLDER_PATTERN.lastIndex = 0;

  while ((match = PLACEHOLDER_PATTERN.exec(text)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Create a default placeholder context for the current moment
 */
export function createDefaultContext(title?: string): PlaceholderContext {
  return {
    date: new Date(),
    title,
  };
}

/**
 * Generate a unique block ID
 */
function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Convert plain text to BlockNote JSON format
 * Each line becomes a paragraph block
 */
export function textToBlockNoteJson(text: string): string {
  const lines = text.split('\n');
  const blocks = lines.map((line) => ({
    id: generateBlockId(),
    type: 'paragraph',
    props: {},
    content: line ? [{ type: 'text', text: line, styles: {} }] : [],
    children: [],
  }));
  return JSON.stringify(blocks);
}

/**
 * Check if a string is valid BlockNote JSON
 */
export function isValidBlockNoteJson(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return (
      Array.isArray(parsed) &&
      parsed.every(
        (block) =>
          typeof block === 'object' && block !== null && 'type' in block
      )
    );
  } catch {
    return false;
  }
}

/**
 * Ensure content is in BlockNote JSON format
 * If plain text, convert it to BlockNote JSON
 */
export function ensureBlockNoteFormat(content: string): string {
  if (isValidBlockNoteJson(content)) {
    return content;
  }
  return textToBlockNoteJson(content);
}
