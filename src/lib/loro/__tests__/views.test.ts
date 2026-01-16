import { describe, it, expect, beforeEach } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import { ViewStore, ViewNotFoundError } from '../views';
import type { CreateSavedViewInput } from '../../types';

describe('ViewStore', () => {
  let doc: LoroDoc;
  let store: ViewStore;

  beforeEach(() => {
    doc = new LoroDoc();
    store = new ViewStore(doc);
  });

  const createInput: CreateSavedViewInput = {
    name: 'Test View',
    filters: [{ field: 'status', operator: 'eq', value: 'todo' }],
    icon: 'list',
  };

  it('should start empty', () => {
    expect(store.getAll()).toEqual([]);
    expect(store.count()).toBe(0);
  });

  it('should create a new view', () => {
    const view = store.create(createInput);

    expect(view.id).toBeDefined();
    expect(view.name).toBe(createInput.name);
    expect(store.count()).toBe(1);
  });

  it('should get a view by ID', () => {
    const created = store.create(createInput);
    const retrieved = store.get(created.id);

    expect(retrieved).toEqual(created);
  });

  it('should return undefined for non-existent view', () => {
    expect(store.get('non-existent')).toBeUndefined();
  });

  it('should throw when getting non-existent view with getOrThrow', () => {
    expect(() => store.getOrThrow('non-existent')).toThrow(ViewNotFoundError);
  });

  it('should check existence', () => {
    const created = store.create(createInput);
    expect(store.exists(created.id)).toBe(true);
    expect(store.exists('non-existent')).toBe(false);
  });

  it('should update valid view', async () => {
    const created = store.create(createInput);

    // Ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = store.update(created.id, {
      name: 'Updated Name',
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated Name');
    expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);
    // Should preserve other fields
    expect(updated.filters).toEqual(created.filters);
  });

  it('should throw when updating non-existent view', () => {
    expect(() => store.update('non-existent', { name: 'New Name' })).toThrow(
      ViewNotFoundError
    );
  });

  it('should delete a view', () => {
    const created = store.create(createInput);
    expect(store.delete(created.id)).toBe(true);
    expect(store.exists(created.id)).toBe(false);
    expect(store.count()).toBe(0);
  });

  it('should return false when deleting non-existent view', () => {
    expect(store.delete('non-existent')).toBe(false);
  });

  it('should list all views sorted by creation date (newest first)', async () => {
    const view1 = store.create({ ...createInput, name: 'View 1' });

    // Ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const view2 = store.create({ ...createInput, name: 'View 2' });

    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(view2.id); // Newest first
    expect(all[1].id).toBe(view1.id);
  });
});
