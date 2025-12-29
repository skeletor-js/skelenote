/**
 * Version History Utilities for Time Machine
 *
 * Provides utilities for extracting, navigating, and managing version history
 * from Loro CRDT documents.
 */

import type { LoroDoc, Frontiers, PeerID } from 'loro-crdt';

/**
 * Loro's native Change type from getAllChanges()
 */
interface LoroChange {
  peer: PeerID;
  counter: number;
  lamport: number;
  length: number;
  /** Unix timestamp in seconds */
  timestamp: number;
  deps: { peer: PeerID; counter: number }[];
  message: string | undefined;
}

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
 * Extract all change points from a Loro document.
 *
 * Loro stores timestamps in seconds; we convert to milliseconds for JavaScript Date.
 * Returns change points sorted by timestamp ascending.
 */
export function extractChangePoints(doc: LoroDoc): ChangePoint[] {
  const allChanges = doc.getAllChanges() as Map<PeerID, LoroChange[]>;
  const points: ChangePoint[] = [];

  for (const [peerId, changes] of allChanges) {
    for (const change of changes) {
      // Build frontier that represents state up to and including this change
      // The frontier is the OpId of the last operation in this change
      const frontier: Frontiers = [
        { peer: peerId, counter: change.counter + change.length - 1 },
      ];

      points.push({
        timestamp: change.timestamp * 1000, // Convert seconds to ms
        frontier,
        peerId: String(peerId),
        changeCount: change.length,
      });
    }
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
