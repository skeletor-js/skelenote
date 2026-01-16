import { describe, it, expect } from 'vitest';
import { LoroDoc } from 'loro-crdt';
import {
  getContentKey,
  serializeObject,
  deserializeObject,
  serializeType,
  deserializeType,
  serializeSavedView,
  deserializeSavedView,
  initializeDocument,
  getSchemaVersion,
  SCHEMA_VERSION,
  CONTENT_PREFIX,
} from '../schema';
import type { SkelenoteObject } from '../../types/object';
import type { TypeDefinition } from '../../types/type-definition';
import type { SavedView } from '../../types/saved-view';

describe('Loro Schema', () => {
  describe('Key Generation', () => {
    it('should generate correct content key', () => {
      const id = 'test-id';
      expect(getContentKey(id)).toBe(`${CONTENT_PREFIX}${id}`);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize objects', () => {
      const obj: SkelenoteObject = {
        id: 'test-id',
        typeId: 'task',
        properties: { title: 'Test' },
        hasContent: true,
        inboxed: true,
        pinned: true,
        archived: false,
        createdAt: 123,
        updatedAt: 456,
      };

      const serialized = serializeObject(obj);
      const deserialized = deserializeObject(serialized);

      expect(deserialized).toEqual(obj);
    });

    it('should handle backward compatibility for pinned', () => {
      const oldObj = {
        id: 'test-id',
        typeId: 'task',
        properties: {},
        hasContent: false,
        inboxed: true,
        createdAt: 123,
        updatedAt: 456,
      };
      const serialized = JSON.stringify(oldObj);
      const deserialized = deserializeObject(serialized);

      expect(deserialized.pinned).toBe(false);
    });

    it('should handle backward compatibility for archived', () => {
      const oldObj = {
        id: 'test-id',
        typeId: 'task',
        properties: {},
        hasContent: false,
        inboxed: true,
        pinned: false,
        createdAt: 123,
        updatedAt: 456,
      };
      const serialized = JSON.stringify(oldObj);
      const deserialized = deserializeObject(serialized);

      expect(deserialized.archived).toBe(false);
    });
  });

  describe('Type Definition Serialization', () => {
    it('should serialize and deserialize type definitions', () => {
      const typeDef: TypeDefinition = {
        id: 'custom-type',
        name: 'Custom',
        icon: 'star',
        schema: [],
        hasContent: true,
        isBuiltIn: false,
      };

      const serialized = serializeType(typeDef);
      const deserialized = deserializeType(serialized);

      expect(deserialized).toEqual(typeDef);
    });
  });

  describe('Saved View Serialization', () => {
    it('should serialize and deserialize saved views', () => {
      const view: SavedView = {
        id: 'view-id',
        name: 'My View',
        filters: [],
        createdAt: 123,
        updatedAt: 456,
      };

      const serialized = serializeSavedView(view);
      const deserialized = deserializeSavedView(serialized);

      expect(deserialized).toEqual(view);
    });
  });

  describe('Document Initialization', () => {
    it('should initialize document with schema version', () => {
      const doc = new LoroDoc();
      initializeDocument(doc);

      const version = getSchemaVersion(doc);
      expect(version).toBe(SCHEMA_VERSION);
    });

    it('should not overwrite existing schema version', () => {
      const doc = new LoroDoc();
      const meta = doc.getMap('_meta');
      meta.set('schemaVersion', 999);

      initializeDocument(doc);

      const version = getSchemaVersion(doc);
      expect(version).toBe(999);
    });
  });
});
