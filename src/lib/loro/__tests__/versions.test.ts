import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import {
  extractChangePoints,
  findFrontierAt,
  getAffectedObjectIds,
  filterChangePointsByObject,
  getVersionHistory,
  getVersionHistoryForObject,
  aggregateByDate,
  getDaysWithChanges,
  getChangesForDate,
  enrichWithDeviceInfo,
  ChangePoint,
  clearAffectedObjectsCache,
} from '../versions';

// Helper for delays

describe('Version History', () => {
  let docA: LoroDoc;
  let docB: LoroDoc;

  beforeEach(() => {
    docA = new LoroDoc();
    docA.setPeerId('1');
    docA.setRecordTimestamp(true);

    docB = new LoroDoc();
    docB.setPeerId('2');
    docB.setRecordTimestamp(true);

    clearAffectedObjectsCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function sync() {
    const bytesA = docA.export({ mode: 'update', from: docB.oplogVersion() });
    const bytesB = docB.export({ mode: 'update', from: docA.oplogVersion() });

    docB.import(bytesA);
    docA.import(bytesB);
  }

  describe('extractChangePoints', () => {
    it('should extract change points from commits', async () => {
      // Commit 1 on A
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1', data: 'v1' }));
      docA.commit();

      await sync();

      const points = extractChangePoints(docB);
      expect(points.length).toBeGreaterThanOrEqual(1);
      expect(points[0].timestamp).toBeGreaterThan(0);
      expect(points[0].peerId).toBe('1');
    });

    it('should skip changes with timestamp 0', async () => {
      const docNoTime = new LoroDoc();
      docNoTime.setRecordTimestamp(false); // Disable timestamp
      docNoTime.getText('text').insert(0, 'hello');
      docNoTime.commit();

      const points = extractChangePoints(docNoTime);
      expect(points.length).toBe(0);
    });
  });

  describe('findFrontierAt', () => {
    it('should find frontier at timestamp', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1', data: 'v1' }));
      docA.commit();

      const points = extractChangePoints(docA);
      const ts = points[0].timestamp;

      const frontier = findFrontierAt(points, ts);
      expect(frontier).not.toBeNull();
      expect(frontier![0].peer).toBe(docA.peerIdStr);
    });

    it('should return null if no changes before timestamp', () => {
      const points: ChangePoint[] = [
        { timestamp: 1000, frontier: [], peerId: '1', changeCount: 1 },
      ];
      expect(findFrontierAt(points, 500)).toBeNull();
    });

    it('should return null if points array empty', () => {
      expect(findFrontierAt([], 1000)).toBeNull();
    });
  });

  describe('Object Change Detection', () => {
    it('should detect affected objects between frontiers', async () => {
      const map = docA.getMap('objects');

      // 1. Add obj1
      map.set('obj1', JSON.stringify({ id: 'obj1', hasContent: false }));
      docA.commit();
      await sync();
      const frontier1 = docB.frontiers();

      // 2. Add obj2
      map.set('obj2', JSON.stringify({ id: 'obj2', hasContent: false }));
      docA.commit();
      await sync();
      const frontier2 = docB.frontiers();

      // 3. Update obj1
      map.set(
        'obj1',
        JSON.stringify({ id: 'obj1', hasContent: false, updated: true })
      );
      docA.commit();
      await sync();
      const frontier3 = docB.frontiers();

      // 4. Delete obj2
      map.delete('obj2');
      docA.commit();
      await sync();
      const frontier4 = docB.frontiers();

      // 1 -> 2: obj2 added
      const diff1 = getAffectedObjectIds(docB, frontier1, frontier2);
      expect(diff1).toContain('obj2');

      // 2 -> 3: obj1 updated
      const diff2 = getAffectedObjectIds(docB, frontier2, frontier3);
      expect(diff2).toContain('obj1');

      // 3 -> 4: obj2 deleted
      const diff3 = getAffectedObjectIds(docB, frontier3, frontier4);
      expect(diff3).toContain('obj2');
    });

    it('should handle content changes', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1', hasContent: true }));
      docA.getText('content:obj1').insert(0, 'content');
      docA.commit();
      await sync();

      const frontier1 = docB.frontiers();

      docA.getText('content:obj1').insert(7, '-updated');
      docA.commit();
      await sync();

      const frontier2 = docB.frontiers();

      const diff = getAffectedObjectIds(docB, frontier1, frontier2);
      expect(diff).toContain('obj1');
    });

    it('should handle malformed object data gracefully', async () => {
      const map = docA.getMap('objects');
      map.set('malformed', 'not-json');
      docA.commit();
      await sync();

      // Should not throw
      const frontier = docB.frontiers();
      const diff = getAffectedObjectIds(docB, null, frontier);
      expect(diff).toContain('malformed');
    });
  });

  describe('Filtering and Aggregation', () => {
    it('should filter changes by object', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1' }));
      docA.commit();

      map.set('obj2', JSON.stringify({ id: 'obj2' }));
      docA.commit();

      await sync();

      const allPoints = extractChangePoints(docB);
      const filtered = filterChangePointsByObject(docB, allPoints, 'obj1');

      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should aggregate by date', () => {
      // Use local dates (noon) to avoid timezone flip issues
      const points: ChangePoint[] = [
        {
          timestamp: new Date(2024, 0, 1, 12).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
        {
          timestamp: new Date(2024, 0, 1, 15).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
        {
          timestamp: new Date(2024, 0, 2, 12).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
      ];

      const aggregated = aggregateByDate(points);
      expect(aggregated.size).toBe(2);
      const days = Array.from(aggregated.values());
      const day1 = days.find((d) => d.totalChanges === 2);
      const day2 = days.find((d) => d.totalChanges === 1);
      expect(day1).toBeDefined();
      expect(day2).toBeDefined();
    });

    it('should get days with changes', () => {
      // Ensure test dates are consistent with getDaysWithChanges calculation
      const points: ChangePoint[] = [
        {
          timestamp: new Date(2024, 0, 1, 12).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
        {
          timestamp: new Date(2024, 0, 5, 12).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
      ];
      const byDate = aggregateByDate(points);
      const days = getDaysWithChanges(byDate, 2024, 0); // Jan 2024

      expect(days.has(1)).toBe(true);
      expect(days.has(5)).toBe(true);
      expect(days.size).toBe(2);
    });

    it('should get changes for date', () => {
      const points: ChangePoint[] = [
        {
          timestamp: new Date(2024, 0, 1, 12).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
      ];
      const byDate = aggregateByDate(points);
      const changes = getChangesForDate(byDate, 2024, 0, 1);
      expect(changes).toHaveLength(1);
    });
  });

  describe('Utils', () => {
    it('should enrich with device info (stubbed)', () => {
      const points: ChangePoint[] = [
        { timestamp: 1000, frontier: [], peerId: '1', changeCount: 1 },
      ];
      const enriched = enrichWithDeviceInfo(points);
      expect(enriched[0].peerId).toBe('1');
      expect(enriched[0].deviceId).toBeUndefined(); // Current stub behavior
    });

    it('getVersionHistory should include timeline info', () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1' }));
      docA.commit();
      const history = getVersionHistory(docA);
      expect(history.earliest).not.toBeNull();
      expect(history.latest).not.toBeNull();
    });

    it('getVersionHistory with empty doc should have null timestamps', () => {
      const emptyDoc = new LoroDoc();
      const history = getVersionHistory(emptyDoc);
      expect(history.earliest).toBeNull();
      expect(history.latest).toBeNull();
      expect(history.changePoints).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when filtering empty change points', async () => {
      const filtered = filterChangePointsByObject(docA, [], 'any-id');
      expect(filtered).toEqual([]);
    });

    it('should handle frontier with empty frontier array', async () => {
      const points: ChangePoint[] = [
        { timestamp: 1000, frontier: [], peerId: '1', changeCount: 1 },
      ];
      const frontier = findFrontierAt(points, 1000);
      // Empty frontier should return null since we can't build a valid frontier
      expect(frontier).toBeNull();
    });

    it('should handle cache hit for affected objects', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1' }));
      docA.commit();
      await sync();

      const frontier1 = docB.frontiers();

      map.set('obj2', JSON.stringify({ id: 'obj2' }));
      docA.commit();
      await sync();

      const frontier2 = docB.frontiers();

      // Call twice to test cache hit
      const first = getAffectedObjectIds(docB, frontier1, frontier2);
      const second = getAffectedObjectIds(docB, frontier1, frontier2);

      expect(first).toEqual(second);
    });

    it('should handle changes for non-existent date', () => {
      const byDate = aggregateByDate([]);
      const changes = getChangesForDate(byDate, 2024, 0, 15);
      expect(changes).toEqual([]);
    });

    it('should return empty set for month with no changes', () => {
      const points: ChangePoint[] = [
        {
          timestamp: new Date(2024, 0, 1, 12).getTime(),
          frontier: [],
          peerId: '1',
          changeCount: 1,
        },
      ];
      const byDate = aggregateByDate(points);
      // Query for February (month 1), no changes
      const days = getDaysWithChanges(byDate, 2024, 1);
      expect(days.size).toBe(0);
    });

    it('should skip duplicate timestamps in filterChangePointsByObject', async () => {
      const map = docA.getMap('objects');

      // Create changes with same timestamp
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      map.set('obj1', JSON.stringify({ id: 'obj1', v: 1 }));
      docA.commit();

      // Two more changes at exact same time (simulated)
      map.set('obj1', JSON.stringify({ id: 'obj1', v: 2 }));
      docA.commit();

      await sync();

      const allPoints = extractChangePoints(docB);
      const filtered = filterChangePointsByObject(docB, allPoints, 'obj1');

      // Should filter properly even with same timestamps
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle getAffectedObjectIds with null prevFrontier', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1' }));
      docA.commit();
      await sync();

      const frontier = docB.frontiers();

      // null prevFrontier means start from empty state
      const affected = getAffectedObjectIds(docB, null, frontier);
      expect(affected).toContain('obj1');
    });

    it('should get version history for specific object', async () => {
      const map = docA.getMap('objects');
      map.set(
        'obj1',
        JSON.stringify({ id: 'obj1', properties: { title: 'Test Object' } })
      );
      docA.commit();

      vi.advanceTimersByTime(1000);

      map.set(
        'obj2',
        JSON.stringify({ id: 'obj2', properties: { title: 'Other' } })
      );
      docA.commit();

      await sync();

      const history = getVersionHistoryForObject(docB, 'obj1');
      expect(history.objectId).toBe('obj1');
      expect(history.objectTitle).toBe('Test Object');
    });

    it('should get version history for deleted object', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1' }));
      docA.commit();
      await sync();

      // Delete the object
      map.delete('obj1');
      docA.commit();
      await sync();

      const history = getVersionHistoryForObject(docB, 'obj1');
      expect(history.objectId).toBe('obj1');
      expect(history.objectTitle).toBe('Deleted Object');
    });

    it('should handle object with name property instead of title', async () => {
      const map = docA.getMap('objects');
      map.set(
        'obj1',
        JSON.stringify({ id: 'obj1', properties: { name: 'Named Object' } })
      );
      docA.commit();
      await sync();

      const history = getVersionHistoryForObject(docB, 'obj1');
      expect(history.objectTitle).toBe('Named Object');
    });

    it('should default to Untitled for object without title or name', async () => {
      const map = docA.getMap('objects');
      map.set('obj1', JSON.stringify({ id: 'obj1', properties: {} }));
      docA.commit();
      await sync();

      const history = getVersionHistoryForObject(docB, 'obj1');
      expect(history.objectTitle).toBe('Untitled');
    });

    it('should handle version history for non-existent object', async () => {
      const history = getVersionHistoryForObject(docA, 'non-existent');
      expect(history.objectId).toBe('non-existent');
      expect(history.objectTitle).toBe('Deleted Object');
      expect(history.changePoints).toEqual([]);
    });
  });
});
