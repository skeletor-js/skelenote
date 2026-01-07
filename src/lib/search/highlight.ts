/**
 * Text highlighting utilities for search results
 * Generates snippets with highlighted match regions
 */

import type { SearchMatch } from './types';

/**
 * A segment of text that may or may not be highlighted
 */
export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Default snippet configuration
 */
const DEFAULT_SNIPPET_LENGTH = 80;
const DEFAULT_CONTEXT_CHARS = 20;

/**
 * Merge overlapping or adjacent match indices
 */
function mergeIndices(
  indices: ReadonlyArray<readonly [number, number]>
): Array<[number, number]> {
  if (indices.length === 0) return [];

  // Sort by start position
  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];

  let current = [...sorted[0]] as [number, number];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    // Check if overlapping or adjacent (allow 1 char gap for better highlighting)
    if (next[0] <= current[1] + 2) {
      // Extend current range
      current[1] = Math.max(current[1], next[1]);
    } else {
      merged.push(current);
      current = [...next] as [number, number];
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Split text into highlighted and non-highlighted segments
 */
export function highlightText(
  text: string,
  indices: ReadonlyArray<readonly [number, number]>
): TextSegment[] {
  if (!text || indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const merged = mergeIndices(indices);
  const segments: TextSegment[] = [];
  let lastEnd = 0;

  for (const [start, end] of merged) {
    // Add non-highlighted segment before match
    if (start > lastEnd) {
      segments.push({
        text: text.slice(lastEnd, start),
        highlighted: false,
      });
    }

    // Add highlighted segment (end index is inclusive in Fuse.js)
    segments.push({
      text: text.slice(start, end + 1),
      highlighted: true,
    });

    lastEnd = end + 1;
  }

  // Add remaining non-highlighted text
  if (lastEnd < text.length) {
    segments.push({
      text: text.slice(lastEnd),
      highlighted: false,
    });
  }

  return segments;
}

/**
 * Create a snippet around the first match with context
 */
export function createSnippet(
  text: string,
  indices: ReadonlyArray<readonly [number, number]>,
  maxLength: number = DEFAULT_SNIPPET_LENGTH,
  contextChars: number = DEFAULT_CONTEXT_CHARS
): { text: string; segments: TextSegment[] } {
  if (!text || indices.length === 0) {
    // Return truncated text if no matches
    const truncated =
      text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
    return {
      text: truncated,
      segments: [{ text: truncated, highlighted: false }],
    };
  }

  // Find the first match
  const firstMatch = indices[0];
  const matchStart = firstMatch[0];
  const matchEnd = firstMatch[1];

  // Calculate snippet boundaries
  let snippetStart = Math.max(0, matchStart - contextChars);
  let snippetEnd = Math.min(text.length, matchEnd + 1 + contextChars);

  // Adjust to not cut words (find word boundaries)
  if (snippetStart > 0) {
    const spaceIndex = text.lastIndexOf(' ', snippetStart);
    if (spaceIndex > snippetStart - 10) {
      snippetStart = spaceIndex + 1;
    }
  }

  if (snippetEnd < text.length) {
    const spaceIndex = text.indexOf(' ', snippetEnd);
    if (spaceIndex !== -1 && spaceIndex < snippetEnd + 10) {
      snippetEnd = spaceIndex;
    }
  }

  // Ensure we don't exceed max length
  if (snippetEnd - snippetStart > maxLength) {
    snippetEnd = snippetStart + maxLength;
  }

  // Extract snippet
  let snippet = text.slice(snippetStart, snippetEnd);

  // Add ellipsis if truncated
  const prefix = snippetStart > 0 ? '...' : '';
  const suffix = snippetEnd < text.length ? '...' : '';
  snippet = prefix + snippet + suffix;

  // Adjust indices for the snippet (account for prefix)
  const adjustedIndices: Array<readonly [number, number]> = indices
    .filter(([start, end]) => end >= snippetStart && start < snippetEnd)
    .map(
      ([start, end]) =>
        [
          Math.max(0, start - snippetStart) + prefix.length,
          Math.min(snippetEnd - snippetStart - 1, end - snippetStart) +
            prefix.length,
        ] as const
    );

  return {
    text: snippet,
    segments: highlightText(snippet, adjustedIndices),
  };
}

/**
 * Get the best snippet from search matches
 * Prioritizes content matches over property matches
 */
export function getBestSnippet(
  matches: SearchMatch[],
  maxLength: number = DEFAULT_SNIPPET_LENGTH
): { text: string; segments: TextSegment[] } | null {
  if (!matches || matches.length === 0) {
    return null;
  }

  // Prefer content matches, then properties
  const contentMatch = matches.find((m) => m.key === 'content');
  const propertyMatch = matches.find((m) => m.key === 'properties');

  const match = contentMatch ?? propertyMatch;

  if (!match) {
    return null;
  }

  return createSnippet(match.value, match.indices, maxLength);
}
