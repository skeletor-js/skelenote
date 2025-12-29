/**
 * Vector Index for Semantic Search
 *
 * Simple brute-force cosine similarity search.
 * Efficient enough for <10k vectors, can be replaced with HNSW if needed.
 */

import {
  Embedding,
  SemanticSearchResult,
  SemanticQueryOptions,
  DEFAULT_QUERY_OPTIONS,
  EMBEDDING_DIMENSIONS,
} from './types';

/**
 * A vector entry in the index.
 */
interface VectorEntry {
  objectId: string;
  embedding: Embedding;
}

/**
 * In-memory vector index for similarity search.
 */
export class VectorIndex {
  private vectors: Map<string, VectorEntry> = new Map();

  /**
   * Add or update a vector in the index.
   */
  add(objectId: string, embedding: Embedding): void {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      console.warn(
        `Vector dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}`
      );
    }
    this.vectors.set(objectId, { objectId, embedding });
  }

  /**
   * Remove a vector from the index.
   */
  remove(objectId: string): boolean {
    return this.vectors.delete(objectId);
  }

  /**
   * Check if an object has a vector in the index.
   */
  has(objectId: string): boolean {
    return this.vectors.has(objectId);
  }

  /**
   * Get the vector for an object.
   */
  get(objectId: string): Embedding | undefined {
    return this.vectors.get(objectId)?.embedding;
  }

  /**
   * Get the number of vectors in the index.
   */
  get size(): number {
    return this.vectors.size;
  }

  /**
   * Clear all vectors from the index.
   */
  clear(): void {
    this.vectors.clear();
  }

  /**
   * Get all object IDs in the index.
   */
  getObjectIds(): string[] {
    return Array.from(this.vectors.keys());
  }

  /**
   * Search for similar vectors using cosine similarity.
   *
   * @param queryEmbedding - The query vector
   * @param options - Search options
   * @returns Sorted array of results (highest similarity first)
   */
  search(
    queryEmbedding: Embedding,
    options: SemanticQueryOptions = {}
  ): SemanticSearchResult[] {
    const {
      limit = DEFAULT_QUERY_OPTIONS.limit,
      threshold = DEFAULT_QUERY_OPTIONS.threshold,
      excludeIds = [],
    } = options;

    const excludeSet = new Set(excludeIds);
    const results: SemanticSearchResult[] = [];

    // Calculate similarity for all vectors
    for (const [objectId, entry] of this.vectors) {
      if (excludeSet.has(objectId)) {
        continue;
      }

      const score = cosineSimilarity(queryEmbedding, entry.embedding);

      if (score >= threshold) {
        results.push({ objectId, score });
      }
    }

    // Sort by score descending and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Find objects similar to a given object.
   *
   * @param objectId - The object to find similar items for
   * @param options - Search options (excludeIds will include the source object)
   * @returns Sorted array of similar objects
   */
  findSimilar(
    objectId: string,
    options: SemanticQueryOptions = {}
  ): SemanticSearchResult[] {
    const embedding = this.get(objectId);
    if (!embedding) {
      return [];
    }

    // Exclude the source object from results
    const excludeIds = [...(options.excludeIds ?? []), objectId];

    return this.search(embedding, { ...options, excludeIds });
  }

  /**
   * Bulk add vectors from an iterable.
   */
  bulkAdd(entries: Iterable<{ objectId: string; embedding: Embedding }>): void {
    for (const entry of entries) {
      this.add(entry.objectId, entry.embedding);
    }
  }

  /**
   * Export all vectors for persistence.
   */
  export(): Array<{ objectId: string; embedding: Embedding }> {
    return Array.from(this.vectors.values()).map(({ objectId, embedding }) => ({
      objectId,
      embedding,
    }));
  }

  /**
   * Import vectors from exported data.
   */
  import(data: Array<{ objectId: string; embedding: Embedding }>): void {
    this.clear();
    this.bulkAdd(data);
  }
}

/**
 * Calculate cosine similarity between two vectors.
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite).
 *
 * For normalized vectors (which our model produces), this simplifies to dot product.
 */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  // Since vectors are normalized, dot product = cosine similarity
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  return dotProduct;
}

/**
 * Calculate Euclidean distance between two vectors.
 * Lower is more similar.
 */
export function euclideanDistance(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sumSquaredDiff = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Normalize a vector to unit length.
 */
export function normalizeVector(v: Embedding): Embedding {
  let magnitude = 0;
  for (let i = 0; i < v.length; i++) {
    magnitude += v[i] * v[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return v;
  }

  const normalized = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    normalized[i] = v[i] / magnitude;
  }

  return normalized;
}

/**
 * Create a new VectorIndex instance.
 */
export function createVectorIndex(): VectorIndex {
  return new VectorIndex();
}
