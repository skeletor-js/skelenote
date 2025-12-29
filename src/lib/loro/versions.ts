/**
 * Version History Utilities for Time Machine
 *
 * Provides utilities for extracting, navigating, and managing version history
 * from Loro CRDT documents.
 */

import type { LoroDoc, Frontiers, PeerID } from 'loro-crdt';

/**
 * Loro's native Change type from getAllChanges()
 * Note: Using type alias to avoid TS6196 unused interface warning
 */
type LoroChange = {
  peer: PeerID;
  counter: number;
  lamport: number;
  length: number;
  /** Unix timestamp in seconds */
  timestamp: number;
  deps: { peer: PeerID; counter: number }[];
  message: string | undefined;
};

// Export for documentation purposes (Loro doesn't export this type)
export type { LoroChange };

/**
 * A processed change point with resolved metadata
 */
export interface ChangePoint {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Loro frontier for checkout - represents state up to this change */
  frontier: Frontiers;
  /** Loro peer ID (internal identifier) */
  peerId: string;
  /** Number of operations in this change */
  changeCount: number;
  /** Resolved device ID (if available) */
  deviceId?: string;
  /** Human-readable device name (if available) */
  deviceName?: string;
  /** Whether this change is from a revoked device */
  isFromRevokedDevice?: boolean;
}

/**
 * Changes grouped by calendar day
 */
export interface DayChanges {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** All change points for this day */
  changePoints: ChangePoint[];
  /** Total number of operations across all changes */
  totalChanges: number;
}

/**
 * Version history summary
 */
export interface VersionHistory {
  /** All change points sorted by timestamp */
  changePoints: ChangePoint[];
  /** Changes grouped by date */
  byDate: Map<string, DayChanges>;
  /** Earliest change timestamp */
  earliest: number | null;
  /** Latest change timestamp */
  latest: number | null;
}

/**
 * Object-filtered version history
 */
export interface ObjectVersionHistory extends VersionHistory {
  /** The object ID this history is filtered to */
  objectId: string;
  /** The object's title (or 'Deleted Object' if no longer exists) */
  objectTitle: string;
}

/**
 * Extract all change points from a Loro document.
 *
 * Loro stores timestamps in seconds; we convert to milliseconds for JavaScript Date.
 * Returns change points sorted by timestamp ascending.
 */
export function extractChangePoints(doc: LoroDoc): ChangePoint[] {
  const allChanges = doc.getAllChanges();
  const points: ChangePoint[] = [];
  let skippedCount = 0;

  for (const [peerId, changes] of allChanges.entries()) {
    if (!Array.isArray(changes)) {
      continue;
    }

    for (const change of changes) {
      // Skip changes without timestamps (historical data before timestamp recording was enabled)
      // These have timestamp: 0 which would incorrectly show as January 1, 1970
      if (change.timestamp === 0) {
        skippedCount++;
        continue;
      }

      // Build frontier that represents state up to and including this change
      // The frontier is the OpId of the last operation in this change
      const frontier: Frontiers = [
        { peer: peerId as PeerID, counter: change.counter + change.length - 1 },
      ];

      points.push({
        timestamp: change.timestamp * 1000, // Convert seconds to ms
        frontier,
        peerId: String(peerId),
        changeCount: change.length,
      });
    }
  }

  if (skippedCount > 0) {
    console.log(`[versions] Skipped ${skippedCount} changes without timestamps (historical data)`);
  }

  // Sort by timestamp ascending
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Find the frontier that represents the document state at a given timestamp.
 *
 * Returns the combined frontier from all peers that includes all operations
 * up to (and including) the specified timestamp.
 *
 * @param changePoints - Sorted array of change points
 * @param timestamp - Target timestamp in milliseconds
 * @returns The frontier at that point, or null if no changes exist before timestamp
 */
export function findFrontierAt(
  changePoints: ChangePoint[],
  timestamp: number
): Frontiers | null {
  if (changePoints.length === 0) return null;

  // Find all changes up to and including the timestamp
  const relevantChanges = changePoints.filter((cp) => cp.timestamp <= timestamp);
  if (relevantChanges.length === 0) return null;

  // For each peer, find the highest counter up to this timestamp
  const peerMaxCounters = new Map<string, number>();

  for (const cp of relevantChanges) {
    // Extract the counter from this change's frontier
    const frontierOp = cp.frontier[0];
    if (!frontierOp) continue;

    const current = peerMaxCounters.get(cp.peerId) ?? -1;
    if (frontierOp.counter > current) {
      peerMaxCounters.set(cp.peerId, frontierOp.counter);
    }
  }

  // Build combined frontier from all peers
  const frontier: Frontiers = [];
  for (const [peer, counter] of peerMaxCounters) {
    frontier.push({ peer: peer as PeerID, counter });
  }

  return frontier.length > 0 ? frontier : null;
}

/**
 * Group change points by calendar day.
 *
 * @param changePoints - Array of change points
 * @returns Map of date strings to day changes
 */
export function aggregateByDate(
  changePoints: ChangePoint[]
): Map<string, DayChanges> {
  const byDate = new Map<string, DayChanges>();

  for (const point of changePoints) {
    const date = new Date(point.timestamp);
    // Format as YYYY-MM-DD in local timezone
    const dateKey = formatDateKey(date);

    const existing = byDate.get(dateKey);
    if (existing) {
      existing.changePoints.push(point);
      existing.totalChanges += point.changeCount;
    } else {
      byDate.set(dateKey, {
        date: dateKey,
        changePoints: [point],
        totalChanges: point.changeCount,
      });
    }
  }

  return byDate;
}

/**
 * Get complete version history from a document.
 */
export function getVersionHistory(doc: LoroDoc): VersionHistory {
  const changePoints = extractChangePoints(doc);
  const byDate = aggregateByDate(changePoints);

  return {
    changePoints,
    byDate,
    earliest: changePoints.length > 0 ? changePoints[0].timestamp : null,
    latest:
      changePoints.length > 0
        ? changePoints[changePoints.length - 1].timestamp
        : null,
  };
}

/**
 * Get the dates in a month that have changes.
 *
 * @param byDate - Map of date strings to day changes
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Set of day numbers (1-31) that have changes
 */
export function getDaysWithChanges(
  byDate: Map<string, DayChanges>,
  year: number,
  month: number
): Set<number> {
  const days = new Set<number>();
  const monthStr = String(month + 1).padStart(2, '0');

  for (const dateKey of byDate.keys()) {
    if (dateKey.startsWith(`${year}-${monthStr}-`)) {
      const day = parseInt(dateKey.slice(-2), 10);
      days.add(day);
    }
  }

  return days;
}

/**
 * Get the change points for a specific date.
 *
 * @param byDate - Map of date strings to day changes
 * @param year - Year
 * @param month - Month (0-11)
 * @param day - Day (1-31)
 * @returns Array of change points for that date, or empty array
 */
export function getChangesForDate(
  byDate: Map<string, DayChanges>,
  year: number,
  month: number,
  day: number
): ChangePoint[] {
  const dateKey = formatDateKey(new Date(year, month, day));
  return byDate.get(dateKey)?.changePoints ?? [];
}

/**
 * Format a date as YYYY-MM-DD in local timezone.
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolve device info from peer ID.
 *
 * This is a basic implementation that returns undefined values.
 * In the future, this can be enhanced to look up device info from
 * the device registry (devices.loro).
 *
 * @param peerId - Loro peer ID
 * @returns Device info object
 */
export function resolveDeviceInfo(_peerId: string): {
  deviceId?: string;
  deviceName?: string;
  isFromRevokedDevice?: boolean;
} {
  // Basic implementation - can be enhanced later with device registry lookup
  // For now, we just return empty values
  // TODO: Look up device info from devices.loro registry
  return {};
}

/**
 * Enhance change points with device info.
 *
 * @param changePoints - Array of change points
 * @returns Change points with device info added
 */
export function enrichWithDeviceInfo(changePoints: ChangePoint[]): ChangePoint[] {
  return changePoints.map((cp) => {
    const deviceInfo = resolveDeviceInfo(cp.peerId);
    return {
      ...cp,
      ...deviceInfo,
    };
  });
}

// ============================================
// Object-Level Change Detection
// ============================================

/**
 * Represents an object's state at a point in time
 */
interface ObjectState {
  id: string;
  data: string; // JSON stringified object data
  content?: string; // Content text if hasContent is true
}

/**
 * Extract all objects from a Loro document.
 *
 * @param doc - The Loro document
 * @returns Map of object ID to object state
 */
function extractAllObjects(doc: LoroDoc): Map<string, ObjectState> {
  const objects = new Map<string, ObjectState>();

  try {
    const objectsMap = doc.getMap('objects');
    const entries = objectsMap.toJSON() as Record<string, string>;

    for (const [id, data] of Object.entries(entries)) {
      if (typeof data !== 'string') continue;

      const state: ObjectState = { id, data };

      // Try to get content if the object has it
      try {
        const parsed = JSON.parse(data);
        if (parsed.hasContent) {
          const contentText = doc.getText(`content:${id}`);
          state.content = contentText.toString();
        }
      } catch {
        // Ignore parse errors
      }

      objects.set(id, state);
    }
  } catch {
    // Objects map might not exist yet
  }

  return objects;
}

/**
 * Check if an object has changed between two states.
 *
 * @param prev - Previous object state
 * @param curr - Current object state
 * @returns True if the object changed
 */
function hasObjectChanged(prev: ObjectState, curr: ObjectState): boolean {
  // Compare the JSON data
  if (prev.data !== curr.data) {
    return true;
  }

  // Compare content if either has it
  if (prev.content !== curr.content) {
    return true;
  }

  return false;
}

/**
 * Get the object IDs that changed between two frontiers.
 *
 * Compares document states at both frontiers to detect:
 * - Added objects (exist in curr but not prev)
 * - Modified objects (different data or content)
 * - Deleted objects (exist in prev but not curr)
 *
 * @param doc - The Loro document
 * @param prevFrontier - Previous frontier (null for initial state)
 * @param currFrontier - Current frontier
 * @returns Array of affected object IDs
 */
export function getAffectedObjectIds(
  doc: LoroDoc,
  prevFrontier: Frontiers | null,
  currFrontier: Frontiers
): string[] {
  try {
    // Fork document at both frontiers
    const prevDoc = prevFrontier ? doc.forkAt(prevFrontier) : null;
    const currDoc = doc.forkAt(currFrontier);

    // Extract objects from both states
    const prevObjects = prevDoc ? extractAllObjects(prevDoc) : new Map<string, ObjectState>();
    const currObjects = extractAllObjects(currDoc);

    const affectedIds: string[] = [];

    // Check for added or modified objects
    for (const [id, currObj] of currObjects) {
      const prevObj = prevObjects.get(id);
      if (!prevObj) {
        // Object was added
        affectedIds.push(id);
      } else if (hasObjectChanged(prevObj, currObj)) {
        // Object was modified
        affectedIds.push(id);
      }
    }

    // Check for deleted objects
    for (const [id] of prevObjects) {
      if (!currObjects.has(id)) {
        affectedIds.push(id);
      }
    }

    return affectedIds;
  } catch (error) {
    console.error('[versions] Failed to get affected object IDs:', error);
    return [];
  }
}

/**
 * Cache for affected objects to avoid recomputing expensive diffs.
 * Key: serialized frontier pair, Value: affected object IDs
 */
const affectedObjectsCache = new Map<string, string[]>();

/**
 * Serialize a frontier pair for use as a cache key.
 */
function serializeFrontierPair(
  prev: Frontiers | null,
  curr: Frontiers
): string {
  const prevKey = prev ? JSON.stringify(prev) : 'null';
  const currKey = JSON.stringify(curr);
  return `${prevKey}|${currKey}`;
}

/**
 * Get affected object IDs with caching.
 */
function getAffectedObjectIdsCached(
  doc: LoroDoc,
  prevFrontier: Frontiers | null,
  currFrontier: Frontiers
): string[] {
  const cacheKey = serializeFrontierPair(prevFrontier, currFrontier);

  const cached = affectedObjectsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = getAffectedObjectIds(doc, prevFrontier, currFrontier);
  affectedObjectsCache.set(cacheKey, result);

  return result;
}

/**
 * Filter change points to only include those that affected a specific object.
 *
 * Uses cumulative frontiers (combining all peers up to each point) rather than
 * individual change point frontiers, to properly compare document states.
 *
 * @param doc - The Loro document
 * @param changePoints - Array of change points (must be sorted by timestamp)
 * @param objectId - The object ID to filter for
 * @returns Array of change points that affected the object
 */
export function filterChangePointsByObject(
  doc: LoroDoc,
  changePoints: ChangePoint[],
  objectId: string
): ChangePoint[] {
  if (changePoints.length === 0) return [];

  const filtered: ChangePoint[] = [];
  let prevCumulativeFrontier: Frontiers | null = null;
  let lastTimestamp: number | null = null;

  for (let i = 0; i < changePoints.length; i++) {
    const cp = changePoints[i];

    // Skip if this timestamp is the same as the last one we processed
    // (the cumulative frontier would be identical)
    if (lastTimestamp !== null && cp.timestamp === lastTimestamp) {
      continue;
    }

    // Build cumulative frontier up to and including this change point
    // This includes all operations from all peers up to this timestamp
    const currCumulativeFrontier = findFrontierAt(changePoints, cp.timestamp);
    if (!currCumulativeFrontier) continue;

    // Skip if the frontier is identical to the previous one
    const currFrontierKey = JSON.stringify(currCumulativeFrontier);
    const prevFrontierKey = prevCumulativeFrontier ? JSON.stringify(prevCumulativeFrontier) : 'null';
    if (currFrontierKey === prevFrontierKey) {
      lastTimestamp = cp.timestamp;
      continue;
    }

    const affectedIds = getAffectedObjectIdsCached(doc, prevCumulativeFrontier, currCumulativeFrontier);

    if (affectedIds.includes(objectId)) {
      filtered.push(cp);
    }

    prevCumulativeFrontier = currCumulativeFrontier;
    lastTimestamp = cp.timestamp;
  }

  return filtered;
}

/**
 * Get the title of an object, handling the case where it might be deleted.
 *
 * @param doc - The Loro document
 * @param objectId - The object ID
 * @returns The object's title or 'Deleted Object'
 */
function getObjectTitle(doc: LoroDoc, objectId: string): string {
  try {
    const objectsMap = doc.getMap('objects');
    const data = objectsMap.get(objectId) as string | undefined;

    if (data) {
      const parsed = JSON.parse(data);
      return (parsed.properties?.title as string) ||
        (parsed.properties?.name as string) ||
        'Untitled';
    }
  } catch {
    // Ignore errors
  }

  return 'Deleted Object';
}

/**
 * Get version history filtered to a specific object.
 *
 * @param doc - The Loro document
 * @param objectId - The object ID to filter for
 * @returns Object-filtered version history
 */
export function getVersionHistoryForObject(
  doc: LoroDoc,
  objectId: string
): ObjectVersionHistory {
  const allChangePoints = extractChangePoints(doc);
  const filteredChangePoints = filterChangePointsByObject(doc, allChangePoints, objectId);
  const byDate = aggregateByDate(filteredChangePoints);
  const objectTitle = getObjectTitle(doc, objectId);

  return {
    objectId,
    objectTitle,
    changePoints: filteredChangePoints,
    byDate,
    earliest: filteredChangePoints.length > 0 ? filteredChangePoints[0].timestamp : null,
    latest:
      filteredChangePoints.length > 0
        ? filteredChangePoints[filteredChangePoints.length - 1].timestamp
        : null,
  };
}

/**
 * Clear the affected objects cache.
 * Call this when the document changes significantly.
 */
export function clearAffectedObjectsCache(): void {
  affectedObjectsCache.clear();
}
