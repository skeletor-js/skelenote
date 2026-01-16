import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticEngine } from '../engine';
import * as model from '../model';
import { DEFAULT_SEMANTIC_CONFIG } from '../types';

// Mock dependencies
vi.mock('../model', () => ({
  embedText: vi.fn(),
  embedBatch: vi.fn(),
  getEmbeddingPipeline: vi.fn(),
  unloadModel: vi.fn(),
  getModelInfo: vi.fn().mockReturnValue({ isLoaded: true }),
}));

vi.mock('../chunker', () => ({
  chunkText: vi.fn((text) => [{ text, start: 0, end: text.length }]),
  needsChunking: vi.fn(() => false),
}));

// Mock Vector Index
const mockVectorIndex = {
  add: vi.fn(),
  remove: vi.fn(),
  search: vi.fn(),
  findSimilar: vi.fn(),
  clear: vi.fn(),
  size: 0,
};
vi.mock('../vector-index', () => ({
  createVectorIndex: vi.fn(() => mockVectorIndex),
}));

// Mock Storage
const mockStorage = {
  initialize: vi.fn(),
  save: vi.fn(),
  saveBatch: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn().mockResolvedValue([]),
  getAllObjectIds: vi.fn().mockResolvedValue([]),
  delete: vi.fn(),
  clear: vi.fn(),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
};
vi.mock('../storage', () => ({
  createEmbeddingStorage: vi.fn(() => mockStorage),
  hashContent: vi.fn((str) => 'hash-' + str),
}));

describe('SemanticEngine', () => {
  let engine: SemanticEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVectorIndex.size = 0;
    mockVectorIndex.search.mockReturnValue([]);

    // Reset storage mocks to prevent pollution
    mockStorage.get.mockReset();
    mockStorage.getAll.mockResolvedValue([]);
    mockStorage.getAllObjectIds.mockResolvedValue([]);

    // Reset default mock implementations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(model.getEmbeddingPipeline).mockResolvedValue({} as any);
    vi.mocked(model.embedText).mockResolvedValue(Float32Array.from([0.1]));
    vi.mocked(model.embedBatch).mockResolvedValue([Float32Array.from([0.1])]);

    engine = new SemanticEngine({ enabled: true });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await engine.initialize();
      expect(mockStorage.initialize).toHaveBeenCalled();
      expect(model.getEmbeddingPipeline).toHaveBeenCalled();
      expect(engine.status).toBe('ready');
    });

    it('should skip initialization if disabled', async () => {
      const disabledEngine = new SemanticEngine({ enabled: false });
      await disabledEngine.initialize();
      expect(mockStorage.initialize).not.toHaveBeenCalled();
      expect(disabledEngine.status).toBe('disabled');
    });

    it('should handle initialization errors', async () => {
      vi.mocked(model.getEmbeddingPipeline).mockRejectedValueOnce(
        new Error('Model load failed')
      );
      await expect(engine.initialize()).rejects.toThrow('Model load failed');
      expect(engine.status).toBe('error');
    });

    it('should load existing embeddings', async () => {
      const records = [
        {
          objectId: '1',
          embedding: [0.1],
          contentHash: 'h1',
          modelVersion: 'v1',
          updatedAt: 1,
        },
      ];
      mockStorage.getAll.mockResolvedValue(records);

      await engine.initialize();
      expect(mockVectorIndex.add).toHaveBeenCalledWith('1', [0.1]);
      expect(engine.indexedCount).toBe(1);
    });
  });

  describe('Indexing', () => {
    beforeEach(async () => {
      await engine.initialize();
      vi.mocked(model.embedBatch).mockResolvedValue([
        Float32Array.from([0.1]),
        Float32Array.from([0.2]),
      ]);
      vi.mocked(model.embedText).mockResolvedValue(Float32Array.from([0.1]));
    });

    it('should index new content', async () => {
      const items = [{ objectId: '1', title: 'T', content: 'C' }];
      await engine.indexContent(items);

      expect(model.embedBatch).toHaveBeenCalled();
      expect(mockVectorIndex.add).toHaveBeenCalled();
      expect(mockStorage.saveBatch).toHaveBeenCalled();
    });

    it('should skip if disabled', async () => {
      await engine.disable();
      await expect(engine.indexContent([])).rejects.toThrow();
    });

    it('should skip unchanged content', async () => {
      mockStorage.getAllObjectIds.mockResolvedValue(['1']);
      mockStorage.get.mockResolvedValue({
        objectId: '1',
        contentHash: 'hash-TC',
        modelVersion: DEFAULT_SEMANTIC_CONFIG.modelId,
      });

      const items = [{ objectId: '1', title: 'T', content: 'C' }];
      await engine.indexContent(items);

      expect(model.embedBatch).not.toHaveBeenCalled();
    });

    it('should index single item', async () => {
      if (!engine.isReady) await engine.initialize();

      const item = { objectId: '1', title: 'T', content: 'C' };
      await engine.indexSingle(item);

      expect(model.embedText).toHaveBeenCalled();
      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockVectorIndex.add).toHaveBeenCalled();
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should search vector index', async () => {
      vi.mocked(model.embedText).mockResolvedValue(Float32Array.from([0.1]));
      mockVectorIndex.search.mockReturnValue([{ id: '1', score: 0.9 }]);

      const results = await engine.search('query');

      expect(model.embedText).toHaveBeenCalledWith('query', expect.any(String));
      expect(mockVectorIndex.search).toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });

    it('should return empty if not ready', async () => {
      const notReadyEngine = new SemanticEngine();
      const results = await notReadyEngine.search('query');
      expect(results).toEqual([]);
    });

    it('should find similar objects', async () => {
      mockVectorIndex.findSimilar.mockReturnValue([{ id: '2', score: 0.8 }]);
      const results = await engine.findSimilar('1');
      expect(mockVectorIndex.findSimilar).toHaveBeenCalledWith(
        '1',
        expect.any(Object)
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('Management', () => {
    it('should cleanup resources', async () => {
      await engine.cleanup();
      expect(mockVectorIndex.clear).toHaveBeenCalled();
      expect(mockStorage.clear).toHaveBeenCalled();
      expect(model.unloadModel).toHaveBeenCalled();
    });

    it('should enable/disable', async () => {
      await engine.disable();
      expect(engine.status).toBe('disabled');
      expect(engine.config.enabled).toBe(false);

      await engine.enable();
      expect(engine.status).toBe('ready');
      expect(engine.config.enabled).toBe(true);
    });

    it('should notify status listeners', async () => {
      const spy = vi.fn();
      const unsub = engine.onStatusChange(spy);

      await engine.initialize();
      expect(spy).toHaveBeenCalled();

      unsub();
    });

    it('should remove from index', async () => {
      await engine.removeFromIndex('1');
      expect(mockStorage.delete).toHaveBeenCalledWith('1');
      expect(mockVectorIndex.remove).toHaveBeenCalledWith('1');
    });

    it('should get stats', () => {
      const stats = engine.getStats();
      expect(stats).toHaveProperty('status');
      expect(stats).toHaveProperty('indexedCount');
      expect(stats).toHaveProperty('modelLoaded');
    });
  });
});
