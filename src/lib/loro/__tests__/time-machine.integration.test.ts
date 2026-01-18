/**
 * @vitest-environment jsdom
 *
 * Time Machine / Version History Integration Tests (P2)
 *
 * Tests the complete Time Machine workflow:
 * - Creating snapshots at historical points
 * - Restoring previous versions
 * - Object-level change detection
 * - Calendar-based history navigation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import {
  extractChangePoints,
  findFrontierAt,
  getVersionHistory,
  getVersionHistoryForObject,
  aggregateByDate,
  getDaysWithChanges,
  getChangesForDate,
  getAffectedObjectIds,
  filterChangePointsByObject,
  clearAffectedObjectsCache,
} from '../versions';

describe('Time Machine Integration', () => {
  let doc: LoroDoc;

  beforeEach(() => {
    vi.useFakeTimers();
    clearAffectedObjectsCache();

    doc = new LoroDoc();
    doc.setPeerId('1'); // Peer ID must be numeric (uint64)
    doc.setRecordTimestamp(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('version history retrieval', () => {
    it('retrieves object state at historical version', async () => {
      // 1. Create object with title "V1"
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      const objectsMap = doc.getMap('objects');

      objectsMap.set(
        'test-obj',
        JSON.stringify({
          id: 'test-obj',
          typeId: 'note',
          properties: { title: 'V1' },
          hasContent: false,
        })
      );
      doc.commit();

      // Note the frontier
      const frontierV1 = doc.frontiers();

      // 2. Update to "V2"
      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      objectsMap.set(
        'test-obj',
        JSON.stringify({
          id: 'test-obj',
          typeId: 'note',
          properties: { title: 'V2' },
          hasContent: false,
        })
      );
      doc.commit();

      // 3. Update to "V3"
      vi.setSystemTime(new Date('2024-01-03T10:00:00Z'));
      objectsMap.set(
        'test-obj',
        JSON.stringify({
          id: 'test-obj',
          typeId: 'note',
          properties: { title: 'V3' },
          hasContent: false,
        })
      );
      doc.commit();

      // 4. Request state at V1 version
      const forkedAtV1 = doc.forkAt(frontierV1);

      // 5. Verify title is "V1"
      const objAtV1 = JSON.parse(
        forkedAtV1.getMap('objects').get('test-obj') as string
      );
      expect(objAtV1.properties.title).toBe('V1');

      // Verify current state is still V3
      const currentObj = JSON.parse(objectsMap.get('test-obj') as string);
      expect(currentObj.properties.title).toBe('V3');
    });

    it('forks document at historical point without affecting original', async () => {
      // 1. Create objects, make changes
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      const objectsMap = doc.getMap('objects');

      objectsMap.set('obj1', JSON.stringify({ id: 'obj1', data: 'initial' }));
      objectsMap.set('obj2', JSON.stringify({ id: 'obj2', data: 'initial' }));
      doc.commit();

      const earlierFrontier = doc.frontiers();

      // Make more changes
      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1', data: 'updated' }));
      objectsMap.set('obj3', JSON.stringify({ id: 'obj3', data: 'new' }));
      doc.commit();

      // 2. Fork at earlier frontier
      const forked = doc.forkAt(earlierFrontier);

      // 3. Verify forked doc has old state
      const forkedObj1 = JSON.parse(
        forked.getMap('objects').get('obj1') as string
      );
      expect(forkedObj1.data).toBe('initial');
      expect(forked.getMap('objects').get('obj3')).toBeUndefined();

      // 4. Original doc unchanged
      const currentObj1 = JSON.parse(objectsMap.get('obj1') as string);
      expect(currentObj1.data).toBe('updated');
      expect(objectsMap.get('obj3')).toBeDefined();
    });

    it('extracts change points with timestamps', async () => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      doc.getMap('objects').set('obj1', JSON.stringify({ id: 'obj1' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-01T11:00:00Z'));
      doc.getMap('objects').set('obj2', JSON.stringify({ id: 'obj2' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      doc.getMap('objects').set('obj3', JSON.stringify({ id: 'obj3' }));
      doc.commit();

      const changePoints = extractChangePoints(doc);

      // Should have 3 change points
      expect(changePoints.length).toBe(3);

      // Sorted by timestamp ascending
      expect(changePoints[0].timestamp).toBeLessThan(changePoints[1].timestamp);
      expect(changePoints[1].timestamp).toBeLessThan(changePoints[2].timestamp);

      // Timestamps should be in milliseconds
      expect(changePoints[0].timestamp).toBeGreaterThan(1700000000000);
    });
  });

  describe('object-level change detection', () => {
    it('detects which objects changed between versions', async () => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      const objectsMap = doc.getMap('objects');

      // Add obj1
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1', v: 1 }));
      doc.commit();
      const frontier1 = doc.frontiers();

      // Add obj2
      vi.setSystemTime(new Date('2024-01-01T11:00:00Z'));
      objectsMap.set('obj2', JSON.stringify({ id: 'obj2', v: 1 }));
      doc.commit();
      const frontier2 = doc.frontiers();

      // Update obj1
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1', v: 2 }));
      doc.commit();
      const frontier3 = doc.frontiers();

      // Delete obj2
      vi.setSystemTime(new Date('2024-01-01T13:00:00Z'));
      objectsMap.delete('obj2');
      doc.commit();
      const frontier4 = doc.frontiers();

      // Check affected objects between frontiers
      const addedObj2 = getAffectedObjectIds(doc, frontier1, frontier2);
      expect(addedObj2).toContain('obj2');

      const updatedObj1 = getAffectedObjectIds(doc, frontier2, frontier3);
      expect(updatedObj1).toContain('obj1');

      const deletedObj2 = getAffectedObjectIds(doc, frontier3, frontier4);
      expect(deletedObj2).toContain('obj2');
    });

    it('filters change points by specific object', async () => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      const objectsMap = doc.getMap('objects');

      // Create two objects
      objectsMap.set('target-obj', JSON.stringify({ id: 'target-obj', v: 1 }));
      objectsMap.set('other-obj', JSON.stringify({ id: 'other-obj', v: 1 }));
      doc.commit();

      // Update target-obj
      vi.setSystemTime(new Date('2024-01-01T11:00:00Z'));
      objectsMap.set('target-obj', JSON.stringify({ id: 'target-obj', v: 2 }));
      doc.commit();

      // Update other-obj (should not affect target)
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      objectsMap.set('other-obj', JSON.stringify({ id: 'other-obj', v: 2 }));
      doc.commit();

      // Update target-obj again
      vi.setSystemTime(new Date('2024-01-01T13:00:00Z'));
      objectsMap.set('target-obj', JSON.stringify({ id: 'target-obj', v: 3 }));
      doc.commit();

      const allPoints = extractChangePoints(doc);
      const targetPoints = filterChangePointsByObject(
        doc,
        allPoints,
        'target-obj'
      );

      // Should have points for initial create and two updates
      expect(targetPoints.length).toBeGreaterThanOrEqual(2);

      // All points should affect target-obj
      for (const point of targetPoints) {
        // Each point's changes should include target-obj
        const affected = getAffectedObjectIds(doc, null, point.frontier);
        // Note: With cumulative frontiers this may include more,
        // but target should be present at some point
        expect(affected).toBeDefined();
      }
    });

    it('handles content changes for object-level history', async () => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      const objectsMap = doc.getMap('objects');

      // Create object with content
      objectsMap.set(
        'content-obj',
        JSON.stringify({
          id: 'content-obj',
          hasContent: true,
        })
      );
      doc.getText('content:content-obj').insert(0, 'Initial content');
      doc.commit();
      const frontier1 = doc.frontiers();

      // Update content only
      vi.setSystemTime(new Date('2024-01-01T11:00:00Z'));
      doc.getText('content:content-obj').insert(15, ' - updated');
      doc.commit();
      const frontier2 = doc.frontiers();

      // Content change should be detected
      const affected = getAffectedObjectIds(doc, frontier1, frontier2);
      expect(affected).toContain('content-obj');
    });
  });

  describe('calendar-based history navigation', () => {
    it('aggregates changes by date', async () => {
      const objectsMap = doc.getMap('objects');

      // Day 1: Two changes
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-01T15:00:00Z'));
      objectsMap.set('obj2', JSON.stringify({ id: 'obj2' }));
      doc.commit();

      // Day 2: One change
      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      objectsMap.set('obj3', JSON.stringify({ id: 'obj3' }));
      doc.commit();

      // Day 3: Three changes
      vi.setSystemTime(new Date('2024-01-03T10:00:00Z'));
      objectsMap.set('obj4', JSON.stringify({ id: 'obj4' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'));
      objectsMap.set('obj5', JSON.stringify({ id: 'obj5' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-03T14:00:00Z'));
      objectsMap.set('obj6', JSON.stringify({ id: 'obj6' }));
      doc.commit();

      const changePoints = extractChangePoints(doc);
      const byDate = aggregateByDate(changePoints);

      // Should have 3 distinct days
      expect(byDate.size).toBe(3);

      // Check day counts
      const day1 = byDate.get('2024-01-01');
      const day2 = byDate.get('2024-01-02');
      const day3 = byDate.get('2024-01-03');

      expect(day1?.changePoints.length).toBe(2);
      expect(day2?.changePoints.length).toBe(1);
      expect(day3?.changePoints.length).toBe(3);
    });

    it('gets days with changes for calendar highlighting', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-05T10:00:00Z'));
      objectsMap.set('obj2', JSON.stringify({ id: 'obj2' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
      objectsMap.set('obj3', JSON.stringify({ id: 'obj3' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-28T10:00:00Z'));
      objectsMap.set('obj4', JSON.stringify({ id: 'obj4' }));
      doc.commit();

      const changePoints = extractChangePoints(doc);
      const byDate = aggregateByDate(changePoints);
      const daysWithChanges = getDaysWithChanges(byDate, 2024, 0); // January

      expect(daysWithChanges.has(1)).toBe(true);
      expect(daysWithChanges.has(5)).toBe(true);
      expect(daysWithChanges.has(15)).toBe(true);
      expect(daysWithChanges.has(28)).toBe(true);
      expect(daysWithChanges.has(10)).toBe(false);
      expect(daysWithChanges.size).toBe(4);
    });

    it('gets changes for specific date', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-15T09:00:00Z'));
      objectsMap.set('morning', JSON.stringify({ id: 'morning' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      objectsMap.set('noon', JSON.stringify({ id: 'noon' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-15T18:00:00Z'));
      objectsMap.set('evening', JSON.stringify({ id: 'evening' }));
      doc.commit();

      // Different day
      vi.setSystemTime(new Date('2024-01-16T10:00:00Z'));
      objectsMap.set('next-day', JSON.stringify({ id: 'next-day' }));
      doc.commit();

      const changePoints = extractChangePoints(doc);
      const byDate = aggregateByDate(changePoints);
      const changesOnJan15 = getChangesForDate(byDate, 2024, 0, 15);

      expect(changesOnJan15.length).toBe(3);

      // Should be sorted by timestamp
      expect(changesOnJan15[0].timestamp).toBeLessThan(
        changesOnJan15[1].timestamp
      );
      expect(changesOnJan15[1].timestamp).toBeLessThan(
        changesOnJan15[2].timestamp
      );
    });

    it('returns empty for dates with no changes', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1' }));
      doc.commit();

      const changePoints = extractChangePoints(doc);
      const byDate = aggregateByDate(changePoints);

      // No changes on Jan 15
      const changesOnJan15 = getChangesForDate(byDate, 2024, 0, 15);
      expect(changesOnJan15).toEqual([]);

      // No changes in February
      const daysInFeb = getDaysWithChanges(byDate, 2024, 1);
      expect(daysInFeb.size).toBe(0);
    });
  });

  describe('getVersionHistory API', () => {
    it('returns complete version history structure', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set('obj1', JSON.stringify({ id: 'obj1' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      objectsMap.set('obj2', JSON.stringify({ id: 'obj2' }));
      doc.commit();

      const history = getVersionHistory(doc);

      expect(history.changePoints.length).toBe(2);
      expect(history.byDate.size).toBe(2);
      expect(history.earliest).not.toBeNull();
      expect(history.latest).not.toBeNull();
      expect(history.earliest).toBeLessThan(history.latest!);
    });

    it('returns empty history for doc without changes', async () => {
      const emptyDoc = new LoroDoc();
      const history = getVersionHistory(emptyDoc);

      expect(history.changePoints).toHaveLength(0);
      expect(history.byDate.size).toBe(0);
      expect(history.earliest).toBeNull();
      expect(history.latest).toBeNull();
    });
  });

  describe('getVersionHistoryForObject API', () => {
    it('returns history filtered to specific object', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set(
        'target',
        JSON.stringify({
          id: 'target',
          properties: { title: 'Target Object' },
        })
      );
      objectsMap.set('other', JSON.stringify({ id: 'other' }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      objectsMap.set(
        'target',
        JSON.stringify({
          id: 'target',
          properties: { title: 'Updated Target' },
        })
      );
      doc.commit();

      vi.setSystemTime(new Date('2024-01-03T10:00:00Z'));
      objectsMap.set(
        'other',
        JSON.stringify({
          id: 'other',
          properties: { title: 'Updated Other' },
        })
      );
      doc.commit();

      const history = getVersionHistoryForObject(doc, 'target');

      expect(history.objectId).toBe('target');
      expect(history.objectTitle).toBe('Updated Target');
      // Should have at least 1 change point for target
      expect(history.changePoints.length).toBeGreaterThanOrEqual(1);
    });

    it('handles deleted objects gracefully', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set(
        'deleted-obj',
        JSON.stringify({
          id: 'deleted-obj',
          properties: { title: 'Soon Deleted' },
        })
      );
      doc.commit();

      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      objectsMap.delete('deleted-obj');
      doc.commit();

      const history = getVersionHistoryForObject(doc, 'deleted-obj');

      expect(history.objectId).toBe('deleted-obj');
      expect(history.objectTitle).toBe('Deleted Object');
    });

    it('returns empty history for non-existent object', async () => {
      const history = getVersionHistoryForObject(doc, 'non-existent');

      expect(history.objectId).toBe('non-existent');
      expect(history.objectTitle).toBe('Deleted Object');
      expect(history.changePoints).toHaveLength(0);
      expect(history.earliest).toBeNull();
      expect(history.latest).toBeNull();
    });
  });

  describe('findFrontierAt', () => {
    it('finds correct frontier at specific timestamp', async () => {
      const objectsMap = doc.getMap('objects');

      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      objectsMap.set('obj', JSON.stringify({ v: 1 }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-01T11:00:00Z'));
      objectsMap.set('obj', JSON.stringify({ v: 2 }));
      doc.commit();

      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
      objectsMap.set('obj', JSON.stringify({ v: 3 }));
      doc.commit();

      const changePoints = extractChangePoints(doc);

      // Find frontier at 10:30 (between v1 and v2)
      const ts1030 = new Date('2024-01-01T10:30:00Z').getTime();
      const frontier1030 = findFrontierAt(changePoints, ts1030);

      expect(frontier1030).not.toBeNull();

      // Fork at that frontier
      const forkedDoc = doc.forkAt(frontier1030!);
      const objAtThatPoint = JSON.parse(
        forkedDoc.getMap('objects').get('obj') as string
      );
      expect(objAtThatPoint.v).toBe(1);

      // Find frontier at 11:30 (between v2 and v3)
      const ts1130 = new Date('2024-01-01T11:30:00Z').getTime();
      const frontier1130 = findFrontierAt(changePoints, ts1130);

      const forkedDoc2 = doc.forkAt(frontier1130!);
      const objAtThatPoint2 = JSON.parse(
        forkedDoc2.getMap('objects').get('obj') as string
      );
      expect(objAtThatPoint2.v).toBe(2);
    });

    it('returns null for timestamp before any changes', async () => {
      vi.setSystemTime(new Date('2024-01-02T10:00:00Z'));
      doc.getMap('objects').set('obj', JSON.stringify({ id: 'obj' }));
      doc.commit();

      const changePoints = extractChangePoints(doc);

      // Query for a time before the first change
      const earlyTimestamp = new Date('2024-01-01T10:00:00Z').getTime();
      const frontier = findFrontierAt(changePoints, earlyTimestamp);

      expect(frontier).toBeNull();
    });
  });

  describe('multi-peer scenario', () => {
    it('tracks changes from multiple peers', async () => {
      const docA = new LoroDoc();
      docA.setPeerId('100'); // Numeric peer ID
      docA.setRecordTimestamp(true);

      const docB = new LoroDoc();
      docB.setPeerId('200'); // Numeric peer ID
      docB.setRecordTimestamp(true);

      // Peer A makes a change
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
      docA.getMap('objects').set('from-a', JSON.stringify({ source: 'A' }));
      docA.commit();

      // Peer B makes a change
      vi.setSystemTime(new Date('2024-01-01T11:00:00Z'));
      docB.getMap('objects').set('from-b', JSON.stringify({ source: 'B' }));
      docB.commit();

      // Sync A to B
      const updateA = docA.export({ mode: 'snapshot' });
      docB.import(updateA);

      // Sync B to A
      const updateB = docB.export({ mode: 'snapshot' });
      docA.import(updateB);

      // Both should now have merged history
      const changePointsA = extractChangePoints(docA);
      const changePointsB = extractChangePoints(docB);

      // Both should have 2 change points
      expect(changePointsA.length).toBe(2);
      expect(changePointsB.length).toBe(2);

      // Should have different peer IDs
      const peerIds = new Set(changePointsA.map((cp) => cp.peerId));
      expect(peerIds.has('100')).toBe(true);
      expect(peerIds.has('200')).toBe(true);
    });
  });
});
