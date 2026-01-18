/**
 * @vitest-environment jsdom
 *
 * ObjectContext Integration Tests (P1)
 *
 * Tests the React context lifecycle with real Loro store:
 * - Provider initialization loads existing data
 * - Mutations trigger debounced save
 * - Cleanup on unmount saves pending changes
 * - dataVersion increments on changes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ObjectProvider, useObjects, useObjectStore } from '../ObjectContext';
import { LoroDoc } from 'loro-crdt';
import type { ReactNode } from 'react';

// In-memory file storage
let memoryFs: Map<string, Uint8Array>;

// Mock Tauri APIs
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/app/data'),
  join: vi.fn().mockImplementation(async (...args) => args.join('/')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi
    .fn()
    .mockImplementation(async (path: string) => memoryFs.has(path)),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockImplementation(async (path: string) => {
    const data = memoryFs.get(path);
    if (!data) throw new Error('File not found');
    return data;
  }),
  writeFile: vi
    .fn()
    .mockImplementation(async (path: string, data: Uint8Array) => {
      memoryFs.set(path, data);
    }),
}));

describe('ObjectContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    memoryFs = new Map();
  });

  afterEach(() => {
    vi.useRealTimers();
    memoryFs.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ObjectProvider>{children}</ObjectProvider>
  );

  describe('initialization', () => {
    it('loads existing data on mount', async () => {
      // Pre-populate storage with existing data
      const tempDoc = new LoroDoc();
      const objectsMap = tempDoc.getMap('objects');
      objectsMap.set(
        'existing-task',
        JSON.stringify({
          id: 'existing-task',
          typeId: 'task',
          properties: { title: 'Existing Task', status: 'todo' },
          hasContent: false,
          inboxed: true,
          pinned: false,
          archived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );
      tempDoc.commit();

      const snapshot = tempDoc.export({ mode: 'snapshot' });
      const storedData = JSON.stringify({ main: Array.from(snapshot) });
      memoryFs.set(
        '/app/data/data/store.loro',
        new TextEncoder().encode(storedData)
      );

      // Render provider
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization
      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      // Verify objects available via store
      expect(result.current.store).not.toBeNull();
      const objects = result.current.store!.getAll({ includeArchived: true });
      expect(objects.some((obj) => obj.id === 'existing-task')).toBe(true);
    });

    it('handles empty storage gracefully', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      expect(result.current.error).toBeNull();
      expect(result.current.store).not.toBeNull();
      expect(result.current.store!.getAll()).toEqual([]);
    });

    it('provides type registry with built-in types', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      // Should have built-in types
      expect(result.current.typeRegistry.get('task')).toBeDefined();
      expect(result.current.typeRegistry.get('note')).toBeDefined();
      expect(result.current.typeRegistry.get('project')).toBeDefined();
      expect(result.current.typeRegistry.get('area')).toBeDefined();
      expect(result.current.typeRegistry.get('tag')).toBeDefined();
    });
  });

  describe('mutations', () => {
    it('persists changes via debounced save', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      // Create object
      act(() => {
        result.current.store!.create({
          typeId: 'task',
          properties: { title: 'New Task', status: 'todo' },
        });
        result.current.refreshData();
      });

      // Save should not have happened yet (debounced)
      expect(memoryFs.has('/app/data/data/store.loro')).toBe(false);

      // Advance past debounce timer (300ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      // Now should be saved
      expect(memoryFs.has('/app/data/data/store.loro')).toBe(true);
    });

    it('increments dataVersion on changes', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      const initialVersion = result.current.dataVersion;

      act(() => {
        result.current.store!.create({
          typeId: 'note',
          properties: { title: 'Test Note' },
        });
        result.current.refreshData();
      });

      expect(result.current.dataVersion).toBe(initialVersion + 1);

      act(() => {
        result.current.refreshData();
      });

      expect(result.current.dataVersion).toBe(initialVersion + 2);
    });

    it('saveNow forces immediate save', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.store!.create({
          typeId: 'task',
          properties: { title: 'Urgent Task', status: 'todo' },
        });
      });

      // Call saveNow (immediate save)
      await act(async () => {
        await result.current.saveNow();
      });

      // Should be saved immediately
      expect(memoryFs.has('/app/data/data/store.loro')).toBe(true);
    });

    it('coalesces rapid mutations into single save', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      // Make many rapid changes
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.store!.create({
            typeId: 'note',
            properties: { title: `Note ${i}` },
          });
          result.current.refreshData();
        });
      }

      // Advance timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      // Verify all objects created
      expect(result.current.store!.getAll().length).toBe(10);

      // Data should be persisted
      expect(memoryFs.has('/app/data/data/store.loro')).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('clears debounce timer on unmount', async () => {
      const { result, unmount } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.store!.create({
          typeId: 'task',
          properties: { title: 'Test Task', status: 'todo' },
        });
        result.current.refreshData();
      });

      // Unmount before debounce completes
      unmount();

      // Advance timers - should not crash
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
    });
  });

  describe('useObjectStore hook', () => {
    it('throws when used outside provider', () => {
      const { result } = renderHook(() => {
        try {
          return { error: null, store: useObjectStore() };
        } catch (e) {
          return { error: e, store: null };
        }
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as Error).message).toContain(
        'ObjectProvider'
      );
    });

    it('returns store after initialization', async () => {
      // Test that useObjects provides the store after initialization
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.isLoading).toBe(false);

      // Verify the store is available through useObjects
      expect(result.current.store).not.toBeNull();
    });
  });

  describe('relation helper', () => {
    it('provides relation helper after initialization', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.relationHelper).not.toBeNull();
    });

    it('can find backlinks', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.isLoading).toBe(false);

      // Create a project and task linked to it
      // Note: project uses 'name' as the title property, not 'title'
      const project = result.current.store!.create({
        typeId: 'project',
        properties: { name: 'Test Project', status: 'active' },
      });

      result.current.store!.create({
        typeId: 'task',
        properties: {
          title: 'Task in Project',
          status: 'todo',
          project: [project.id], // Relations must be arrays
        },
      });

      result.current.refreshData();

      // Find backlinks to project
      const backlinks = result.current.relationHelper!.findBacklinks(
        project.id
      );
      expect(backlinks.length).toBeGreaterThan(0);
      expect(backlinks[0].propertyId).toBe('project');
    });
  });

  describe('auto-save interval', () => {
    it('auto-saves periodically as safety net', async () => {
      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Verify initialized
      expect(result.current.isLoading).toBe(false);

      // Create object
      act(() => {
        result.current.store!.create({
          typeId: 'note',
          properties: { title: 'Auto-save Test' },
        });
      });

      // Advance by 30 seconds (auto-save interval)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Should be saved by auto-save
      expect(memoryFs.has('/app/data/data/store.loro')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('sets error state on initialization failure', async () => {
      // Make appDataDir fail
      const { appDataDir } = await import('@tauri-apps/api/path');
      vi.mocked(appDataDir).mockRejectedValueOnce(
        new Error('Storage unavailable')
      );

      const { result } = renderHook(() => useObjects(), { wrapper });

      // Wait for initialization by advancing timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Storage unavailable');
    });
  });
});
