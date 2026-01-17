/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkObjectToDaily, isLinkedToToday } from '../link-to-daily';
import type { SkelenoteObject } from '@/lib/types';

// Mock the daily-notes module
const mockDailyNote: SkelenoteObject = {
  id: 'note-2024-01-15',
  typeId: 'note',
  properties: {
    title: 'Monday, January 15',
    isDailyNote: true,
  },
  hasContent: true,
  inboxed: false,
  pinned: false,
  archived: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

vi.mock('../daily-notes', () => ({
  getOrCreateDailyNote: vi.fn(() => mockDailyNote),
  getDailyNoteId: vi.fn(() => 'note-2024-01-15'),
}));

// Mock store
const mockStore = {
  setProperty: vi.fn(),
  getContent: vi.fn(),
  setContent: vi.fn(),
};

describe('lib/daily/link-to-daily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getContent.mockReturnValue(null);
  });

  describe('linkObjectToDaily', () => {
    const mockObject: SkelenoteObject = {
      id: 'task-1',
      typeId: 'task',
      properties: { title: 'Test Task' },
      hasContent: false,
      inboxed: false,
      pinned: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('should return the daily note', () => {
      const result = linkObjectToDaily(mockStore as any, mockObject);
      expect(result).toEqual(mockDailyNote);
    });

    it('should set the dailyNote relation on the object', () => {
      linkObjectToDaily(mockStore as any, mockObject);
      expect(mockStore.setProperty).toHaveBeenCalledWith(
        'task-1',
        'dailyNote',
        ['note-2024-01-15']
      );
    });

    it('should append mention to daily note content', () => {
      linkObjectToDaily(mockStore as any, mockObject);
      expect(mockStore.setContent).toHaveBeenCalled();

      const setContentCall = mockStore.setContent.mock.calls[0];
      expect(setContentCall[0]).toBe('note-2024-01-15');

      const content = JSON.parse(setContentCall[1]);
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe('paragraph');
      expect(content[0].content[0].type).toBe('mention');
      expect(content[0].content[0].props.objectId).toBe('task-1');
    });

    it('should append to existing content', () => {
      const existingContent = JSON.stringify([
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
      ]);
      mockStore.getContent.mockReturnValue(existingContent);

      linkObjectToDaily(mockStore as any, mockObject);

      const setContentCall = mockStore.setContent.mock.calls[0];
      const content = JSON.parse(setContentCall[1]);
      expect(content).toHaveLength(2);
    });

    it('should use name property if title is missing', () => {
      const projectObject: SkelenoteObject = {
        id: 'project-1',
        typeId: 'project',
        properties: { name: 'My Project' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      linkObjectToDaily(mockStore as any, projectObject);

      const setContentCall = mockStore.setContent.mock.calls[0];
      const content = JSON.parse(setContentCall[1]);
      expect(content[0].content[0].props.objectName).toBe('My Project');
    });

    it('should use url property for links', () => {
      const linkObject: SkelenoteObject = {
        id: 'link-1',
        typeId: 'link',
        properties: { url: 'https://example.com' },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      linkObjectToDaily(mockStore as any, linkObject);

      const setContentCall = mockStore.setContent.mock.calls[0];
      const content = JSON.parse(setContentCall[1]);
      expect(content[0].content[0].props.objectName).toBe(
        'https://example.com'
      );
    });

    it('should remove trailing empty blocks', () => {
      const contentWithEmptyBlocks = JSON.stringify([
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ]);
      mockStore.getContent.mockReturnValue(contentWithEmptyBlocks);

      linkObjectToDaily(mockStore as any, mockObject);

      const setContentCall = mockStore.setContent.mock.calls[0];
      const content = JSON.parse(setContentCall[1]);
      // Empty blocks should be removed, then mention added
      expect(content).toHaveLength(2);
      expect(content[0].content[0].text).toBe('Hello');
    });
  });

  describe('isLinkedToToday', () => {
    it('should return false if no dailyNote relation', () => {
      const object: SkelenoteObject = {
        id: 'task-1',
        typeId: 'task',
        properties: {},
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(isLinkedToToday(object)).toBe(false);
    });

    it('should return false if dailyNote is empty array', () => {
      const object: SkelenoteObject = {
        id: 'task-1',
        typeId: 'task',
        properties: { dailyNote: [] },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(isLinkedToToday(object)).toBe(false);
    });

    it('should return true if linked to today', () => {
      const object: SkelenoteObject = {
        id: 'task-1',
        typeId: 'task',
        properties: { dailyNote: ['note-2024-01-15'] },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(isLinkedToToday(object)).toBe(true);
    });

    it('should return false if linked to different day', () => {
      const object: SkelenoteObject = {
        id: 'task-1',
        typeId: 'task',
        properties: { dailyNote: ['note-2024-01-14'] },
        hasContent: false,
        inboxed: false,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(isLinkedToToday(object)).toBe(false);
    });
  });
});
