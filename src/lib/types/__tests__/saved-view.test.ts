import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSavedView,
  generateViewId,
  isSavedView,
  type CreateSavedViewInput,
} from '../saved-view';

describe('Saved View Types', () => {
  const mockDate = 1700000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateViewId', () => {
    it('should generate a string ID', () => {
      const id = generateViewId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = generateViewId();
      const id2 = generateViewId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createSavedView', () => {
    const input: CreateSavedViewInput = {
      name: 'Test View',
      filters: [{ field: 'status', operator: 'eq', value: 'todo' }],
      sort: { field: 'createdAt', direction: 'desc' },
      typeFilter: 'task',
      icon: 'list',
    };

    it('should create a view with all properties', () => {
      const view = createSavedView(input);

      expect(view.id).toBeDefined();
      expect(view.name).toBe(input.name);
      expect(view.filters).toEqual(input.filters);
      expect(view.sort).toEqual(input.sort);
      expect(view.typeFilter).toBe(input.typeFilter);
      expect(view.icon).toBe(input.icon);
      expect(view.createdAt).toBe(mockDate);
      expect(view.updatedAt).toBe(mockDate);
    });

    it('should handle minimal input', () => {
      const minimalInput: CreateSavedViewInput = {
        name: 'Minimal View',
        filters: [],
      };

      const view = createSavedView(minimalInput);

      expect(view.name).toBe('Minimal View');
      expect(view.filters).toEqual([]);
      expect(view.sort).toBeUndefined();
      expect(view.typeFilter).toBeUndefined();
      expect(view.icon).toBeUndefined();
    });
  });

  describe('isSavedView', () => {
    const validView = createSavedView({
      name: 'Valid View',
      filters: [],
    });

    it('should return true for valid view', () => {
      expect(isSavedView(validView)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isSavedView(null)).toBe(false);
    });

    it('should return false for plain object missing fields', () => {
      expect(isSavedView({})).toBe(false);
      expect(isSavedView({ name: 'Incomplete' })).toBe(false);
    });

    it('should return false when types are incorrect', () => {
      const invalid = { ...validView, name: 123 };
      expect(isSavedView(invalid)).toBe(false);
    });
  });
});
