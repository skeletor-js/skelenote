import { describe, it, expect, beforeEach } from 'vitest';
import {
  VectorIndex,
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  createVectorIndex,
} from '../vector-index';
import { EMBEDDING_DIMENSIONS } from '../types';

// Helper to create test embeddings
function createEmbedding(values: number[]): Float32Array {
  // Pad or truncate to match expected dimensions
  const result = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < Math.min(values.length, EMBEDDING_DIMENSIONS); i++) {
    result[i] = values[i];
  }
  return result;
}

// Helper to create a random normalized embedding
function createRandomEmbedding(): Float32Array {
  const embedding = new Float32Array(EMBEDDING_DIMENSIONS);
  let magnitude = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    embedding[i] = Math.random() - 0.5;
    magnitude += embedding[i] * embedding[i];
  }
  magnitude = Math.sqrt(magnitude);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    embedding[i] /= magnitude;
  }
  return embedding;
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = normalizeVector(createEmbedding([1, 2, 3]));
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns -1 for opposite vectors', () => {
    const v1 = normalizeVector(createEmbedding([1, 0, 0]));
    const v2 = normalizeVector(createEmbedding([-1, 0, 0]));
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const v1 = normalizeVector(createEmbedding([1, 0, 0]));
    const v2 = normalizeVector(createEmbedding([0, 1, 0]));
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
  });

  it('handles similar but not identical vectors', () => {
    const v1 = normalizeVector(createEmbedding([1, 2, 3]));
    const v2 = normalizeVector(createEmbedding([1.1, 2.1, 3.1]));
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeGreaterThan(0.99);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('throws on dimension mismatch', () => {
    const v1 = new Float32Array([1, 2, 3]);
    const v2 = new Float32Array([1, 2]);
    expect(() => cosineSimilarity(v1, v2)).toThrow('dimension mismatch');
  });
});

describe('euclideanDistance', () => {
  it('returns 0 for identical vectors', () => {
    const v = createEmbedding([1, 2, 3]);
    expect(euclideanDistance(v, v)).toBe(0);
  });

  it('calculates correct distance for simple vectors', () => {
    const v1 = new Float32Array([0, 0, 0]);
    const v2 = new Float32Array([3, 4, 0]);
    expect(euclideanDistance(v1, v2)).toBe(5); // 3-4-5 triangle
  });

  it('throws on dimension mismatch', () => {
    const v1 = new Float32Array([1, 2, 3]);
    const v2 = new Float32Array([1, 2]);
    expect(() => euclideanDistance(v1, v2)).toThrow('dimension mismatch');
  });
});

describe('normalizeVector', () => {
  it('normalizes vector to unit length', () => {
    const v = createEmbedding([3, 4, 0]);
    const normalized = normalizeVector(v);

    // Calculate magnitude
    let magnitude = 0;
    for (let i = 0; i < normalized.length; i++) {
      magnitude += normalized[i] * normalized[i];
    }
    magnitude = Math.sqrt(magnitude);

    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('preserves direction', () => {
    const v = createEmbedding([3, 4, 0]);
    const normalized = normalizeVector(v);

    // Ratios should be preserved
    expect(normalized[0] / normalized[1]).toBeCloseTo(3 / 4, 5);
  });

  it('handles zero vector', () => {
    const v = createEmbedding([0, 0, 0]);
    const normalized = normalizeVector(v);
    expect(normalized[0]).toBe(0);
    expect(normalized[1]).toBe(0);
  });
});

describe('VectorIndex', () => {
  let index: VectorIndex;

  beforeEach(() => {
    index = createVectorIndex();
  });

  describe('basic operations', () => {
    it('starts empty', () => {
      expect(index.size).toBe(0);
    });

    it('adds vectors', () => {
      index.add('obj1', createRandomEmbedding());
      expect(index.size).toBe(1);
      expect(index.has('obj1')).toBe(true);
    });

    it('updates existing vectors', () => {
      const e1 = createRandomEmbedding();
      const e2 = createRandomEmbedding();

      index.add('obj1', e1);
      index.add('obj1', e2);

      expect(index.size).toBe(1);
      expect(index.get('obj1')).toBe(e2);
    });

    it('removes vectors', () => {
      index.add('obj1', createRandomEmbedding());
      expect(index.remove('obj1')).toBe(true);
      expect(index.size).toBe(0);
      expect(index.has('obj1')).toBe(false);
    });

    it('returns false when removing non-existent vector', () => {
      expect(index.remove('nonexistent')).toBe(false);
    });

    it('clears all vectors', () => {
      index.add('obj1', createRandomEmbedding());
      index.add('obj2', createRandomEmbedding());
      index.clear();
      expect(index.size).toBe(0);
    });

    it('gets all object IDs', () => {
      index.add('obj1', createRandomEmbedding());
      index.add('obj2', createRandomEmbedding());
      const ids = index.getObjectIds();
      expect(ids).toContain('obj1');
      expect(ids).toContain('obj2');
      expect(ids).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('returns empty array for empty index', () => {
      const query = createRandomEmbedding();
      const results = index.search(query);
      expect(results).toEqual([]);
    });

    it('finds exact match', () => {
      const embedding = createRandomEmbedding();
      index.add('obj1', embedding);

      const results = index.search(embedding);
      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe('obj1');
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it('ranks results by similarity', () => {
      // Create a base embedding
      const query = normalizeVector(createEmbedding([1, 0, 0]));

      // Add vectors with different similarities
      index.add('similar', normalizeVector(createEmbedding([0.9, 0.1, 0])));
      index.add(
        'less_similar',
        normalizeVector(createEmbedding([0.5, 0.5, 0]))
      );
      index.add(
        'least_similar',
        normalizeVector(createEmbedding([0.1, 0.9, 0]))
      );

      const results = index.search(query, { threshold: 0 });

      expect(results.length).toBe(3);
      expect(results[0].objectId).toBe('similar');
      expect(results[1].objectId).toBe('less_similar');
      expect(results[2].objectId).toBe('least_similar');
    });

    it('respects limit option', () => {
      for (let i = 0; i < 10; i++) {
        index.add(`obj${i}`, createRandomEmbedding());
      }

      const query = createRandomEmbedding();
      const results = index.search(query, { limit: 3, threshold: 0 });

      expect(results).toHaveLength(3);
    });

    it('respects threshold option', () => {
      const query = normalizeVector(createEmbedding([1, 0, 0]));

      // High similarity
      index.add('high', normalizeVector(createEmbedding([0.95, 0.05, 0])));
      // Low similarity
      index.add('low', normalizeVector(createEmbedding([0.1, 0.9, 0])));

      const results = index.search(query, { threshold: 0.8 });

      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe('high');
    });

    it('excludes specified IDs', () => {
      const embedding = createRandomEmbedding();
      index.add('obj1', embedding);
      index.add('obj2', embedding);

      const results = index.search(embedding, { excludeIds: ['obj1'] });

      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe('obj2');
    });
  });

  describe('findSimilar', () => {
    it('excludes source object from results', () => {
      const embedding = createRandomEmbedding();
      index.add('source', embedding);
      index.add('similar', embedding);

      const results = index.findSimilar('source');

      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe('similar');
    });

    it('returns empty array for non-existent object', () => {
      const results = index.findSimilar('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('bulk operations', () => {
    it('bulk adds vectors', () => {
      const entries = [
        { objectId: 'obj1', embedding: createRandomEmbedding() },
        { objectId: 'obj2', embedding: createRandomEmbedding() },
        { objectId: 'obj3', embedding: createRandomEmbedding() },
      ];

      index.bulkAdd(entries);

      expect(index.size).toBe(3);
    });

    it('exports and imports correctly', () => {
      const e1 = createRandomEmbedding();
      const e2 = createRandomEmbedding();

      index.add('obj1', e1);
      index.add('obj2', e2);

      const exported = index.export();
      expect(exported).toHaveLength(2);

      const newIndex = createVectorIndex();
      newIndex.import(exported);

      expect(newIndex.size).toBe(2);
      expect(newIndex.has('obj1')).toBe(true);
      expect(newIndex.has('obj2')).toBe(true);

      // Check embeddings are equal
      const imported1 = newIndex.get('obj1')!;
      for (let i = 0; i < e1.length; i++) {
        expect(imported1[i]).toBe(e1[i]);
      }
    });
  });
});
