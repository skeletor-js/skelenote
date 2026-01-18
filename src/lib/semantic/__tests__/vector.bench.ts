/**
 * Performance benchmarks for VectorIndex (Semantic Search)
 *
 * Run with: pnpm vitest bench src/lib/semantic/__tests__/vector.bench.ts
 */
import { bench, describe, beforeAll } from 'vitest';
import {
  VectorIndex,
  cosineSimilarity,
  normalizeVector,
} from '../vector-index';
import { EMBEDDING_DIMENSIONS, type Embedding } from '../types';

// Generate a random normalized vector
function randomVector(): Embedding {
  const arr = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    arr[i] = Math.random() * 2 - 1; // -1 to 1
  }
  return normalizeVector(arr);
}

// Pre-generate vectors to avoid generation overhead in benchmarks
function preGenerateVectors(count: number): Embedding[] {
  return Array.from({ length: count }, () => randomVector());
}

describe('VectorIndex Insert Performance', () => {
  bench(
    'insert 100 vectors',
    () => {
      const index = new VectorIndex();
      for (let i = 0; i < 100; i++) {
        index.add(`obj-${i}`, randomVector());
      }
    },
    { iterations: 20 }
  );

  bench(
    'insert 1000 vectors',
    () => {
      const index = new VectorIndex();
      for (let i = 0; i < 1000; i++) {
        index.add(`obj-${i}`, randomVector());
      }
    },
    { iterations: 10 }
  );

  bench(
    'insert 5000 vectors',
    () => {
      const index = new VectorIndex();
      for (let i = 0; i < 5000; i++) {
        index.add(`obj-${i}`, randomVector());
      }
    },
    { iterations: 3 }
  );
});

describe('VectorIndex Search Performance', () => {
  let smallIndex: VectorIndex;
  let mediumIndex: VectorIndex;
  let largeIndex: VectorIndex;
  let queryVector: Embedding;

  beforeAll(() => {
    smallIndex = new VectorIndex();
    mediumIndex = new VectorIndex();
    largeIndex = new VectorIndex();

    for (let i = 0; i < 100; i++) {
      smallIndex.add(`obj-${i}`, randomVector());
    }
    for (let i = 0; i < 1000; i++) {
      mediumIndex.add(`obj-${i}`, randomVector());
    }
    for (let i = 0; i < 5000; i++) {
      largeIndex.add(`obj-${i}`, randomVector());
    }

    queryVector = randomVector();
  });

  bench('search 100 vectors (top 10)', () => {
    smallIndex.search(queryVector, { limit: 10 });
  });

  bench('search 1000 vectors (top 10)', () => {
    mediumIndex.search(queryVector, { limit: 10 });
  });

  bench('search 5000 vectors (top 10)', () => {
    largeIndex.search(queryVector, { limit: 10 });
  });

  bench('search 5000 vectors (top 50)', () => {
    largeIndex.search(queryVector, { limit: 50 });
  });
});

describe('Cosine Similarity Performance', () => {
  let vectors: Embedding[];

  beforeAll(() => {
    vectors = preGenerateVectors(1000);
  });

  bench('10,000 cosine similarity calculations', () => {
    const queryVec = vectors[0];
    for (let i = 1; i < 100; i++) {
      for (let j = 0; j < 100; j++) {
        cosineSimilarity(queryVec, vectors[(i * 10 + j) % vectors.length]);
      }
    }
  });
});

describe('VectorIndex Export/Import', () => {
  let indexData: Array<{ objectId: string; embedding: Embedding }>;

  beforeAll(() => {
    const index = new VectorIndex();
    for (let i = 0; i < 1000; i++) {
      index.add(`obj-${i}`, randomVector());
    }
    indexData = index.export();
  });

  bench('export 1000 vectors', () => {
    const index = new VectorIndex();
    for (let i = 0; i < 1000; i++) {
      index.add(`obj-${i}`, randomVector());
    }
    index.export();
  });

  bench('import 1000 vectors', () => {
    const index = new VectorIndex();
    index.import(indexData);
  });
});
