/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Transformers.js
const mockPipe = vi.fn();
const mockPipeline = vi
  .fn()
  .mockImplementation(() => Promise.resolve(mockPipe));

vi.mock('@xenova/transformers', () => ({
  pipeline: (...args: any[]) => mockPipeline(...args),
  env: {
    allowLocalModels: true,
    useBrowserCache: true,
  },
}));

import {
  getEmbeddingPipeline,
  embedText,
  embedBatch,
  isModelLoaded,
  unloadModel,
  getModelInfo,
} from '../model';
import { DEFAULT_SEMANTIC_CONFIG } from '../types';

describe('EmbeddingModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state if possible, or just rely on unloadModel
    unloadModel();
  });

  describe('getEmbeddingPipeline', () => {
    it('should initialize pipeline with default model', async () => {
      await getEmbeddingPipeline();
      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        DEFAULT_SEMANTIC_CONFIG.modelId,
        expect.any(Object)
      );
    });

    it('should return cached pipeline on subsequent calls', async () => {
      const p1 = await getEmbeddingPipeline();
      const p2 = await getEmbeddingPipeline();
      expect(mockPipeline).toHaveBeenCalledTimes(1);
      expect(p1).toBe(p2);
    });

    it('should handle initialization errors', async () => {
      mockPipeline.mockRejectedValueOnce(new Error('Init failed'));
      await expect(getEmbeddingPipeline()).rejects.toThrow('Init failed');
      expect(isModelLoaded()).toBe(false);
    });

    it('should report progress during initialization', async () => {
      const onProgress = vi.fn();

      // Capture the options passed to pipeline to trigger progress callback

      mockPipeline.mockImplementationOnce(
        async (_task, _model, options: any) => {
          if (options?.progress_callback) {
            options.progress_callback({
              status: 'download',
              progress: 50,
              loaded: 500,
              total: 1000,
              file: 'model.onnx',
            });
            options.progress_callback({ status: 'init' });
            options.progress_callback({ status: 'ready' });
          }
          return mockPipe;
        }
      );

      await getEmbeddingPipeline('custom-model', onProgress);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'download',
          percent: 50,
        })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'load',
          percent: 50,
          message: 'Loading model into memory...',
        })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'load',
          percent: 100,
          message: 'Model ready',
        })
      );
    });
  });

  describe('embedText', () => {
    it('should generate embedding for text', async () => {
      const mockEmbedding = new Float32Array(384).fill(0.1);
      mockPipe.mockResolvedValue({ data: mockEmbedding });

      const result = await embedText('hello world');

      expect(mockPipe).toHaveBeenCalledWith('hello world', {
        pooling: 'mean',
        normalize: true,
      });
      expect(result).toEqual(mockEmbedding);
    });

    it('should warn if dimensions do not match', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockEmbedding = new Float32Array(100).fill(0.1); // Wrong size
      mockPipe.mockResolvedValue({ data: mockEmbedding });

      await embedText('test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected embedding dimensions')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('embedBatch', () => {
    it('should process embeddings in batches', async () => {
      const mockEmbedding = new Float32Array(384).fill(0.1);
      mockPipe.mockResolvedValue({ data: mockEmbedding });

      const texts = Array(10).fill('test text');
      const results = await embedBatch(texts);

      expect(results).toHaveLength(10);
      expect(mockPipe).toHaveBeenCalledTimes(10);
    });

    it('should return empty array for empty input', async () => {
      const results = await embedBatch([]);
      expect(results).toEqual([]);
      expect(mockPipe).not.toHaveBeenCalled();
    });

    it('should report progress during batch processing', async () => {
      const mockEmbedding = new Float32Array(384).fill(0.1);
      mockPipe.mockResolvedValue({ data: mockEmbedding });
      const onProgress = vi.fn();

      const texts = ['a', 'b', 'c'];
      await embedBatch(texts, undefined, onProgress);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'index',
          total: 3,
        })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Embedding complete',
        })
      );
    });
  });

  describe('model management', () => {
    it('should report loaded state correctly', async () => {
      expect(isModelLoaded()).toBe(false);
      await getEmbeddingPipeline();
      expect(isModelLoaded()).toBe(true);

      const info = getModelInfo();
      expect(info.isLoaded).toBe(true);
      expect(info.modelId).toBe(DEFAULT_SEMANTIC_CONFIG.modelId);
    });

    it('should unload model correctly', async () => {
      await getEmbeddingPipeline();
      expect(isModelLoaded()).toBe(true);

      await unloadModel();
      expect(isModelLoaded()).toBe(false);

      const info = getModelInfo();
      expect(info.isLoaded).toBe(false);
      expect(info.modelId).toBeNull();
    });
  });
});
