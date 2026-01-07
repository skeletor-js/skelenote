/**
 * Block-level diff utilities for comparing BlockNote documents
 * Uses position-based comparison with content similarity detection
 */

import { deserializeBlockNoteDocument } from '@/lib/editor';

/**
 * BlockNote block structure (simplified for diffing)
 */
export interface Block {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown[];
  children?: Block[];
}

/**
 * Diff status for a block
 */
export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * A block annotated with its diff status
 */
export interface BlockDiff {
  id: string;
  type: string;
  status: DiffStatus;
  block: Block;
}

/**
 * Summary of changes between two documents
 */
export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

/**
 * Complete diff result for two documents
 */
export interface ContentDiff {
  historical: BlockDiff[];
  current: BlockDiff[];
  summary: DiffSummary;
}

/**
 * Property diff result
 */
export interface PropertyDiff {
  key: string;
  status: DiffStatus;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Extract plain text from inline content array
 */
function extractInlineText(content: unknown[] | undefined): string {
  if (!content || !Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const obj = item as Record<string, unknown>;

      if (obj.type === 'text' && typeof obj.text === 'string') {
        return obj.text;
      }
      if (
        obj.type === 'mention' &&
        typeof obj.props === 'object' &&
        obj.props
      ) {
        const props = obj.props as Record<string, unknown>;
        return `@${props.objectName || 'mention'}`;
      }
      if (obj.type === 'link' && Array.isArray(obj.content)) {
        return extractInlineText(obj.content);
      }
      return '';
    })
    .join('');
}

/**
 * Generate a content hash for a block based on its text content
 * Uses text extraction rather than JSON comparison for reliability
 */
function getBlockContentHash(block: Block): string {
  const text = extractInlineText(block.content);
  // Include type in hash so headings vs paragraphs with same text are different
  return `${block.type}:${text}`;
}

/**
 * Flatten nested blocks into a single array
 */
function flattenBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];

  function traverse(blockList: Block[]) {
    for (const block of blockList) {
      result.push(block);
      if (block.children && Array.isArray(block.children)) {
        traverse(block.children);
      }
    }
  }

  traverse(blocks);
  return result;
}

/**
 * Compare two blocks to determine if they're equivalent (ignoring ID)
 */
function blocksAreEqual(a: Block, b: Block): boolean {
  return getBlockContentHash(a) === getBlockContentHash(b);
}

/**
 * Compute block-level diff between two BlockNote documents
 * Uses content-based matching to find unchanged/modified blocks
 *
 * @param historicalContent - JSON string of historical BlockNote document
 * @param currentContent - JSON string of current BlockNote document
 * @returns ContentDiff with annotated blocks for each side
 */
export function computeContentDiff(
  historicalContent: string | null,
  currentContent: string | null
): ContentDiff {
  const historicalBlocks = historicalContent
    ? (deserializeBlockNoteDocument(historicalContent) as Block[]) || []
    : [];
  const currentBlocks = currentContent
    ? (deserializeBlockNoteDocument(currentContent) as Block[]) || []
    : [];

  // Flatten nested blocks for comparison
  const flatHistorical = flattenBlocks(historicalBlocks);
  const flatCurrent = flattenBlocks(currentBlocks);

  // Create content hash maps for finding matches
  const currentHashMap = new Map<string, number[]>();
  flatCurrent.forEach((block, index) => {
    const hash = getBlockContentHash(block);
    if (!currentHashMap.has(hash)) {
      currentHashMap.set(hash, []);
    }
    currentHashMap.get(hash)!.push(index);
  });

  const historicalHashMap = new Map<string, number[]>();
  flatHistorical.forEach((block, index) => {
    const hash = getBlockContentHash(block);
    if (!historicalHashMap.has(hash)) {
      historicalHashMap.set(hash, []);
    }
    historicalHashMap.get(hash)!.push(index);
  });

  // Track which blocks have been matched
  const matchedCurrentIndices = new Set<number>();
  const matchedHistoricalIndices = new Set<number>();

  const historicalDiff: BlockDiff[] = [];
  const currentDiff: BlockDiff[] = [];
  const summary: DiffSummary = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
  };

  // First pass: Find exact content matches
  flatHistorical.forEach((block, hIndex) => {
    const hash = getBlockContentHash(block);
    const currentIndices = currentHashMap.get(hash);

    if (currentIndices && currentIndices.length > 0) {
      // Find the closest unmatched current index
      const unmatchedCurrent = currentIndices.find(
        (i) => !matchedCurrentIndices.has(i)
      );
      if (unmatchedCurrent !== undefined) {
        matchedHistoricalIndices.add(hIndex);
        matchedCurrentIndices.add(unmatchedCurrent);
      }
    }
  });

  // Second pass: Build diff arrays
  flatHistorical.forEach((block, index) => {
    let status: DiffStatus;

    if (matchedHistoricalIndices.has(index)) {
      status = 'unchanged';
      summary.unchanged++;
    } else {
      // Check if there's a similar block at the same position that's modified
      if (index < flatCurrent.length && !matchedCurrentIndices.has(index)) {
        const currentBlock = flatCurrent[index];
        if (currentBlock.type === block.type) {
          // Same type at same position - likely modified
          status = 'modified';
          summary.modified++;
          matchedCurrentIndices.add(index);
          matchedHistoricalIndices.add(index);
        } else {
          status = 'removed';
          summary.removed++;
        }
      } else {
        status = 'removed';
        summary.removed++;
      }
    }

    historicalDiff.push({
      id: `h-${index}`,
      type: block.type,
      status,
      block,
    });
  });

  // Build current diff array
  flatCurrent.forEach((block, index) => {
    let status: DiffStatus;

    if (matchedCurrentIndices.has(index)) {
      // Check if it was an exact match or a modification
      const historicalIndex = Array.from(matchedHistoricalIndices).find(
        (hIndex) => {
          const hBlock = flatHistorical[hIndex];
          return blocksAreEqual(block, hBlock);
        }
      );

      if (historicalIndex !== undefined) {
        status = 'unchanged';
      } else {
        status = 'modified';
      }
    } else {
      status = 'added';
      summary.added++;
    }

    currentDiff.push({
      id: `c-${index}`,
      type: block.type,
      status,
      block,
    });
  });

  return { historical: historicalDiff, current: currentDiff, summary };
}

/**
 * Compute property-level diff between two objects
 */
export function computePropertyDiff(
  historicalProps: Record<string, unknown>,
  currentProps: Record<string, unknown>
): PropertyDiff[] {
  const diffs: PropertyDiff[] = [];
  const allKeys = new Set([
    ...Object.keys(historicalProps),
    ...Object.keys(currentProps),
  ]);

  for (const key of allKeys) {
    // Skip internal/computed properties
    if (key === 'content' || key === 'id') continue;

    const oldValue = historicalProps[key];
    const newValue = currentProps[key];

    // Check if values are both empty/null/undefined
    const oldIsEmpty =
      oldValue === null || oldValue === undefined || oldValue === '';
    const newIsEmpty =
      newValue === null || newValue === undefined || newValue === '';

    if (oldIsEmpty && newIsEmpty) {
      // Both empty, skip
      continue;
    }

    let status: DiffStatus;
    if (oldIsEmpty && !newIsEmpty) {
      status = 'added';
    } else if (!oldIsEmpty && newIsEmpty) {
      status = 'removed';
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      status = 'modified';
    } else {
      status = 'unchanged';
    }

    // Only include if there's an actual difference
    if (status !== 'unchanged') {
      diffs.push({ key, status, oldValue, newValue });
    }
  }

  return diffs;
}

/**
 * Check if two documents have any differences
 */
export function hasContentChanges(
  historicalContent: string | null,
  currentContent: string | null
): boolean {
  const diff = computeContentDiff(historicalContent, currentContent);
  return (
    diff.summary.added > 0 ||
    diff.summary.removed > 0 ||
    diff.summary.modified > 0
  );
}
