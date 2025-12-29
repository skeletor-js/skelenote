/**
 * Semantic Search Module
 *
 * Local ML-powered semantic search using embeddings.
 */

// Types
export * from './types';

// Core functionality
export { chunkText, estimateTokenCount, needsChunking } from './chunker';
export {
  embedText,
  embedBatch,
  getEmbeddingPipeline,
  isModelLoaded,
  unloadModel,
  getModelInfo,
} from './model';
export {
  VectorIndex,
  createVectorIndex,
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
} from './vector-index';
export {
  EmbeddingStorage,
  createEmbeddingStorage,
  hashContent,
} from './storage';
export {
  SemanticEngine,
  createSemanticEngine,
  getSemanticEngine,
  setSemanticEngine,
  type IndexableContent,
} from './engine';
