import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateId, createObject, isSkelenoteObject } from '../object';
import { BuiltInTypeIds } from '../type-definition';
import type { SkelenoteObject } from '../object';

describe('generateId', () => {
  it('should return a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should return a UUID v4 format', () => {
    const id = generateId();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('createObject', () => {
  // Mock Date.now() for predictable timestamps
  const mockNow = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create an object with required fields', () => {
    const obj = createObject({ typeId: BuiltInTypeIds.TASK });

    expect(obj.id).toBeDefined();
    expect(obj.typeId).toBe(BuiltInTypeIds.TASK);
    expect(obj.properties).toEqual({});
    expect(obj.hasContent).toBe(false);
    expect(obj.inboxed).toBe(true);
    expect(obj.pinned).toBe(false);
    expect(obj.archived).toBe(false);
  });

  it('should set timestamps to current time', () => {
    const obj = createObject({ typeId: BuiltInTypeIds.TASK });

    expect(obj.createdAt).toBe(mockNow);
    expect(obj.updatedAt).toBe(mockNow);
  });

  it('should include provided properties', () => {
    const obj = createObject({
      typeId: BuiltInTypeIds.TASK,
      properties: {
        title: 'Test Task',
        status: 'todo',
        priority: 'high',
      },
    });

    expect(obj.properties.title).toBe('Test Task');
    expect(obj.properties.status).toBe('todo');
    expect(obj.properties.priority).toBe('high');
  });

  it('should set hasContent based on withContent input', () => {
    const withContent = createObject({
      typeId: BuiltInTypeIds.TASK,
      withContent: true,
    });
    expect(withContent.hasContent).toBe(true);

    const withoutContent = createObject({
      typeId: BuiltInTypeIds.TASK,
      withContent: false,
    });
    expect(withoutContent.hasContent).toBe(false);
  });

  it('should default hasContent to false when withContent not specified', () => {
    const obj = createObject({ typeId: BuiltInTypeIds.TASK });
    expect(obj.hasContent).toBe(false);
  });

  it('should respect inboxed override', () => {
    const inboxed = createObject({
      typeId: BuiltInTypeIds.TASK,
      inboxed: true,
    });
    expect(inboxed.inboxed).toBe(true);

    const notInboxed = createObject({
      typeId: BuiltInTypeIds.TASK,
      inboxed: false,
    });
    expect(notInboxed.inboxed).toBe(false);
  });

  it('should default inboxed to true', () => {
    const obj = createObject({ typeId: BuiltInTypeIds.TASK });
    expect(obj.inboxed).toBe(true);
  });

  it('should always initialize pinned to false', () => {
    const obj = createObject({ typeId: BuiltInTypeIds.TASK });
    expect(obj.pinned).toBe(false);
  });

  it('should always initialize archived to false', () => {
    const obj = createObject({ typeId: BuiltInTypeIds.TASK });
    expect(obj.archived).toBe(false);
  });

  it('should generate unique IDs for each object', () => {
    const obj1 = createObject({ typeId: BuiltInTypeIds.TASK });
    const obj2 = createObject({ typeId: BuiltInTypeIds.TASK });
    const obj3 = createObject({ typeId: BuiltInTypeIds.TASK });

    expect(obj1.id).not.toBe(obj2.id);
    expect(obj2.id).not.toBe(obj3.id);
    expect(obj1.id).not.toBe(obj3.id);
  });
});

describe('isSkelenoteObject', () => {
  // Helper to create a valid object for testing
  function createValidObject(): SkelenoteObject {
    return {
      id: 'test-id',
      typeId: BuiltInTypeIds.TASK,
      properties: { title: 'Test' },
      hasContent: true,
      inboxed: true,
      pinned: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  describe('valid objects', () => {
    it('should return true for valid SkelenoteObject', () => {
      const obj = createValidObject();
      expect(isSkelenoteObject(obj)).toBe(true);
    });

    it('should return true when pinned is undefined (backward compat)', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).pinned;
      expect(isSkelenoteObject(obj)).toBe(true);
    });

    it('should return true when archived is undefined (backward compat)', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).archived;
      expect(isSkelenoteObject(obj)).toBe(true);
    });

    it('should return true for object with empty properties', () => {
      const obj = createValidObject();
      obj.properties = {};
      expect(isSkelenoteObject(obj)).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('should return false for null', () => {
      expect(isSkelenoteObject(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSkelenoteObject(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isSkelenoteObject('string')).toBe(false);
      expect(isSkelenoteObject(123)).toBe(false);
      expect(isSkelenoteObject(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isSkelenoteObject([])).toBe(false);
      expect(isSkelenoteObject([createValidObject()])).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('should return false when id is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).id;
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when typeId is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).typeId;
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when properties is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).properties;
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when hasContent is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).hasContent;
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when inboxed is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).inboxed;
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when createdAt is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).createdAt;
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when updatedAt is missing', () => {
      const obj = createValidObject();
      delete (obj as unknown as Record<string, unknown>).updatedAt;
      expect(isSkelenoteObject(obj)).toBe(false);
    });
  });

  describe('wrong types', () => {
    it('should return false when id is not a string', () => {
      const obj = { ...createValidObject(), id: 123 };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when typeId is not a string', () => {
      const obj = { ...createValidObject(), typeId: null };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when properties is null', () => {
      const obj = { ...createValidObject(), properties: null };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when properties is not an object', () => {
      const obj = { ...createValidObject(), properties: 'invalid' };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when hasContent is not a boolean', () => {
      const obj = { ...createValidObject(), hasContent: 'true' };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when inboxed is not a boolean', () => {
      const obj = { ...createValidObject(), inboxed: 1 };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when createdAt is not a number', () => {
      const obj = { ...createValidObject(), createdAt: '2024-01-01' };
      expect(isSkelenoteObject(obj)).toBe(false);
    });

    it('should return false when updatedAt is not a number', () => {
      const obj = { ...createValidObject(), updatedAt: new Date() };
      expect(isSkelenoteObject(obj)).toBe(false);
    });
  });
});
