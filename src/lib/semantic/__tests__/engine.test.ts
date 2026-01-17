/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockVectorIndex = {
  add: vi.fn(),
  remove: vi.fn(),
  search: vi.fn(),
  findSimilar: vi.fn(),
  clear: vi.fn(),
  size: 0,
};

const mockStorage = {
  initialize: vi.fn(),
  getAll: vi.fn(),
  getAllObjectIds: vi.fn(),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
  save: vi.fn(),
  saveBatch: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

vi.mock('../vector-index', () => ({
  createVectorIndex: () => mockVectorIndex,
}));

vi.mock('../storage', () => ({
  createEmbeddingStorage: () => mockStorage,
  hashContent: (str: string) => `hash-${str}`,
}));

vi.mock('../model', () => ({
  getEmbeddingPipeline: vi.fn(),
  embedText: vi.fn(),
  embedBatch: vi.fn(),
  isModelLoaded: vi.fn(),
  unloadModel: vi.fn(),
  getModelInfo: vi.fn().mockReturnValue({ isLoaded: false }),
}));

vi.mock('../chunker', () => ({
  chunkText: vi.fn(),
  needsChunking: vi.fn(),
}));

import { chunkText, needsChunking } from '../chunker';
import {
  SemanticEngine,
  createSemanticEngine,
  getSemanticEngine,
  setSemanticEngine,
} from '../engine';
import { getEmbeddingPipeline, embedText, embedBatch } from '../model';

describe('SemanticEngine', () => {
  let engine: SemanticEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new SemanticEngine({ enabled: true });
    // Reset mocks default behavior
    mockStorage.getAll.mockResolvedValue([]);
    mockStorage.getAllObjectIds.mockResolvedValue([]);
    mockStorage.initialize.mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should initialize storage and model', async () => {
      await engine.initialize();
      expect(mockStorage.initialize).toHaveBeenCalled();
      expect(getEmbeddingPipeline).toHaveBeenCalled();
      expect(engine.status).toBe('ready');
    });

    it('should not initialize if disabled', async () => {
      engine = new SemanticEngine({ enabled: false });
      await engine.initialize();
      expect(mockStorage.initialize).not.toHaveBeenCalled();
      expect(engine.status).toBe('disabled');
    });

    it('should load existing embeddings into index', async () => {
      const records = [
        { objectId: '1', embedding: new Float32Array([1]) },
        { objectId: '2', embedding: new Float32Array([2]) },
      ];
      mockStorage.getAll.mockResolvedValue(records);
      mockStorage.getMetadata.mockResolvedValue(123456789);

      await engine.initialize();

      expect(mockVectorIndex.add).toHaveBeenCalledTimes(2);
      expect(mockVectorIndex.add).toHaveBeenCalledWith(
        '1',
        records[0].embedding
      );
      expect(engine.indexedCount).toBe(2);
    });

    it('should handle errors during initialization', async () => {
      mockStorage.initialize.mockRejectedValue(new Error('Storage failure'));
      await expect(engine.initialize()).rejects.toThrow('Storage failure');
      expect(engine.status).toBe('error');
    });

    it('should expose config', () => {
      expect(engine.config).toBeDefined();
      expect(engine.config.enabled).toBe(true);
    });

    it('should handle status listeners', () => {
      const listener = vi.fn();
      const unsubscribe = engine.onStatusChange(listener);

      // Use private method or trigger change to test listener
      // But since private, we trigger via initialize
      engine['setStatus']('loading');
      expect(listener).toHaveBeenCalledWith('loading');

      unsubscribe();
      engine['setStatus']('ready');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle status listener errors', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('listener failed');
      });

      engine.onStatusChange(badListener);
      engine['setStatus']('loading');

      expect(badListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Status listener error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('indexContent', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should index new content', async () => {
      const items = [{ objectId: '1', title: 'Test', content: 'Content' }];
      const mockEmbedding = [new Float32Array(384).fill(0.1)];
      vi.mocked(embedBatch).mockResolvedValue(mockEmbedding);

      await engine.indexContent(items);

      expect(mockStorage.getAllObjectIds).toHaveBeenCalled();
      expect(embedBatch).toHaveBeenCalled();
      expect(mockStorage.saveBatch).toHaveBeenCalled();
      expect(mockVectorIndex.add).toHaveBeenCalledWith('1', mockEmbedding[0]);
    });

    it('should skip existing content if unchanged', async () => {
      mockStorage.getAllObjectIds.mockResolvedValue(['1']);
      mockStorage.get.mockResolvedValue({
        objectId: '1',
        contentHash: 'hash-TestContent', // match hashContent mock
        modelVersion: 'Xenova/all-MiniLM-L6-v2', // default model
      });

      const items = [{ objectId: '1', title: 'Test', content: 'Content' }];

      await engine.indexContent(items);

      expect(embedBatch).not.toHaveBeenCalled();
    });

    it('should re-index content if changed', async () => {
      mockStorage.getAllObjectIds.mockResolvedValue(['1']);
      mockStorage.get.mockResolvedValue({
        objectId: '1',
        contentHash: 'hash-OldContent',
        modelVersion: 'Xenova/all-MiniLM-L6-v2',
      });

      const items = [{ objectId: '1', title: 'Test', content: 'Content' }];
      const mockEmbedding = [new Float32Array(384).fill(0.1)];
      vi.mocked(embedBatch).mockResolvedValue(mockEmbedding);

      await engine.indexContent(items);

      expect(embedBatch).toHaveBeenCalled();
      expect(mockVectorIndex.add).toHaveBeenCalled();
    });

    it('should throw if indexing when disabled', async () => {
      engine = new SemanticEngine({ enabled: false });
      const items = [{ objectId: '1', title: 'T', content: 'C' }];
      await expect(engine.indexContent(items)).rejects.toThrow('not enabled');
    });

    it('should chunk long content during indexing', async () => {
      const items = [{ objectId: '1', title: 'Long', content: 'Content...' }];
      vi.mocked(needsChunking).mockReturnValue(true);
      vi.mocked(chunkText).mockReturnValue([
        { text: 'Chunk 1', start: 0, end: 7 },
      ]);
      vi.mocked(embedBatch).mockResolvedValue([new Float32Array(384)]);

      await engine.indexContent(items);

      expect(chunkText).toHaveBeenCalled();
    });

    it('should handle indexing errors', async () => {
      mockStorage.getAllObjectIds.mockRejectedValue(new Error('Storage error'));
      const items = [{ objectId: '1', title: 'T', content: 'C' }];

      await expect(engine.indexContent(items)).rejects.toThrow('Storage error');
      expect(engine.status).toBe('error');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should perform semantic search', async () => {
      const mockQueryEmbedding = new Float32Array(384).fill(0.2);
      vi.mocked(embedText).mockResolvedValue(mockQueryEmbedding);
      mockVectorIndex.search.mockReturnValue([{ objectId: '1', score: 0.9 }]);

      const results = await engine.search('query');

      expect(embedText).toHaveBeenCalledWith('query', expect.any(String));
      expect(mockVectorIndex.search).toHaveBeenCalledWith(
        mockQueryEmbedding,
        expect.any(Object)
      );
      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe('1');
    });

    it('should return empty if not ready', async () => {
      engine = new SemanticEngine({ enabled: false }); // not ready
      const results = await engine.search('query');
      expect(results).toEqual([]);
    });
  });

  describe('lifecycle', () => {
    it('should disable and cleanup', async () => {
      await engine.initialize();
      await engine.disable(true);

      expect(engine.status).toBe('disabled');
      expect(mockVectorIndex.clear).toHaveBeenCalled();
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should enable engine', async () => {
      engine = new SemanticEngine({ enabled: false });
      await engine.enable();
      expect(engine.config.enabled).toBe(true);
      expect(engine.status).toBe('ready');
    });
  });

  describe('single item operations', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should index single item', async () => {
      const item = { objectId: '1', title: 'Test', content: 'Content' };
      const mockEmbedding = new Float32Array(384).fill(0.1);
      vi.mocked(embedText).mockResolvedValue(mockEmbedding);
      // Mock no existing item
      mockStorage.get.mockResolvedValue(null);

      await engine.indexSingle(item);

      expect(embedText).toHaveBeenCalled();
      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockVectorIndex.add).toHaveBeenCalledWith('1', mockEmbedding);
    });

    it('should skip indexSingle if unchanged', async () => {
      const item = { objectId: '1', title: 'Test', content: 'Content' };
      mockStorage.get.mockResolvedValue({
        objectId: '1',
        contentHash: 'hash-TestContent',
        modelVersion: 'model',
      });

      await engine.indexSingle(item);

      expect(embedText).not.toHaveBeenCalled();
    });

    it('should remove from index', async () => {
      await engine.removeFromIndex('1');
      expect(mockStorage.delete).toHaveBeenCalledWith('1');
      expect(mockVectorIndex.remove).toHaveBeenCalledWith('1');
    });

    it('should return if indexSingle not ready', async () => {
      engine = new SemanticEngine({ enabled: false });
      const item = { objectId: '1', title: 'Test', content: 'Content' };
      await engine.indexSingle(item);
      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should chunk content in indexSingle', async () => {
      const item = { objectId: '1', title: 'Long', content: 'Content...' };
      vi.mocked(needsChunking).mockReturnValue(true);
      vi.mocked(chunkText).mockReturnValue([
        { text: 'Chunk 1', start: 0, end: 7 },
      ]);
      vi.mocked(embedText).mockResolvedValue(new Float32Array(384));

      await engine.indexSingle(item);

      expect(chunkText).toHaveBeenCalled();
    });
  });

  describe('advanced operations', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should find similar objects', async () => {
      const results = [{ objectId: '2', score: 0.8 }];
      mockVectorIndex.findSimilar.mockReturnValue(results);

      const similar = await engine.findSimilar('1');

      expect(mockVectorIndex.findSimilar).toHaveBeenCalledWith(
        '1',
        expect.any(Object)
      );
      expect(similar).toEqual(results);
    });

    it('should findSimilar return empty if not ready', async () => {
      engine = new SemanticEngine({ enabled: false });
      const results = await engine.findSimilar('1');
      expect(results).toEqual([]);
    });

    it('should rebuild index', async () => {
      const items = [{ objectId: '1', title: 'Test', content: 'Content' }];
      const mockEmbedding = [new Float32Array(384).fill(0.1)];
      vi.mocked(embedBatch).mockResolvedValue(mockEmbedding);

      await engine.rebuildIndex(items);

      expect(mockVectorIndex.clear).toHaveBeenCalled();
      expect(mockStorage.clear).toHaveBeenCalled();
      expect(mockVectorIndex.add).toHaveBeenCalled();
    });

    it('should get embedding for text', async () => {
      const mockEmbedding = new Float32Array(384).fill(0.5);
      vi.mocked(embedText).mockResolvedValue(mockEmbedding);

      const result = await engine.getEmbedding('text');
      expect(result).toBe(mockEmbedding);
    });

    it('should expose stats', () => {
      const stats = engine.getStats();
      expect(stats).toHaveProperty('indexedCount');
      expect(stats).toHaveProperty('status');
    });
  });

  describe('singleton and factory', () => {
    it('should create engine via factory', () => {
      const e = createSemanticEngine();
      expect(e).toBeInstanceOf(SemanticEngine);
    });

    it('should manage global singleton', () => {
      setSemanticEngine(null);
      const e1 = getSemanticEngine();
      const e2 = getSemanticEngine();
      expect(e1).toBe(e2);

      const custom = new SemanticEngine();
      setSemanticEngine(custom);
      expect(getSemanticEngine()).toBe(custom);
    });
  });
});
