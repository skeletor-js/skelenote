/**
 * Semantic Search Type Definitions
 *
 * Types for local ML-powered semantic search using embeddings.
 */

/**
 * A vector embedding - array of floating point numbers representing semantic meaning.
 * Using all-MiniLM-L6-v2 model which produces 384-dimensional vectors.
 */
export type Embedding = Float32Array;

/**
 * Dimensions of the embedding vector (model-specific).
 */
export const EMBEDDING_DIMENSIONS = 384;

/**
 * Configuration for the semantic search feature.
 */
export interface SemanticSearchConfig {
  /** Whether semantic search is enabled on this device */
  enabled: boolean;
  /** Model identifier (e.g., 'Xenova/all-MiniLM-L6-v2') */
  modelId: string;
  /** Similarity threshold (0-1) - results below this are filtered out */
  similarityThreshold: number;
  /** Weight for semantic results in hybrid search (0-1) */
  semanticWeight: number;
}

/**
 * Default configuration values.
 */
export const DEFAULT_SEMANTIC_CONFIG: SemanticSearchConfig = {
  enabled: false,
  modelId: 'Xenova/all-MiniLM-L6-v2',
  similarityThreshold: 0.2, // Lower threshold to capture conceptual relationships
  semanticWeight: 0.5,
};

/**
 * Status of the semantic search engine.
 */
export type SemanticEngineStatus =
  | 'disabled' // Feature not enabled
  | 'downloading' // Model is being downloaded
  | 'loading' // Model is loading into memory
  | 'indexing' // Building/updating embedding index
  | 'ready' // Ready to accept queries
  | 'error'; // Error state

/**
 * Progress information for long-running operations.
 */
export interface SemanticProgress {
  /** Current operation type */
  operation: 'download' | 'index' | 'load';
  /** Progress percentage (0-100) */
  percent: number;
  /** Current item being processed (for indexing) */
  current?: number;
  /** Total items to process (for indexing) */
  total?: number;
  /** Bytes downloaded (for download) */
  bytesDownloaded?: number;
  /** Total bytes to download (for download) */
  bytesTotal?: number;
  /** Human-readable status message */
  message: string;
}

/**
 * A stored embedding record.
 */
export interface EmbeddingRecord {
  /** Object ID this embedding belongs to */
  objectId: string;
  /** The embedding vector */
  embedding: Embedding;
  /** Hash of the content used to generate this embedding */
  contentHash: string;
  /** Version of the model used to generate this embedding */
  modelVersion: string;
  /** Timestamp when this embedding was created/updated */
  updatedAt: number;
}

/**
 * A semantic search result.
 */
export interface SemanticSearchResult {
  /** Object ID of the match */
  objectId: string;
  /** Cosine similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * A text chunk prepared for embedding.
 */
export interface TextChunk {
  /** The chunk text */
  text: string;
  /** Start character index in original content */
  startIndex: number;
  /** End character index in original content */
  endIndex: number;
  /** Chunk index (0-based) */
  chunkIndex: number;
}

/**
 * Options for text chunking.
 */
export interface ChunkingOptions {
  /** Maximum characters per chunk (default: 512) */
  maxChunkSize?: number;
  /** Overlap between chunks in characters (default: 50) */
  overlap?: number;
  /** Whether to preserve sentence boundaries (default: true) */
  preserveSentences?: boolean;
}

/**
 * Default chunking options.
 */
export const DEFAULT_CHUNKING_OPTIONS: Required<ChunkingOptions> = {
  maxChunkSize: 512,
  overlap: 50,
  preserveSentences: true,
};

/**
 * Model download state.
 */
export interface ModelDownloadState {
  /** Whether the model exists locally */
  isDownloaded: boolean;
  /** Download progress if currently downloading */
  progress?: SemanticProgress;
  /** Error message if download failed */
  error?: string;
}

/**
 * Indexing state.
 */
export interface IndexingState {
  /** Whether indexing is in progress */
  isIndexing: boolean;
  /** Progress if currently indexing */
  progress?: SemanticProgress;
  /** Number of objects indexed */
  indexedCount: number;
  /** Timestamp of last full index */
  lastIndexedAt?: number;
}

/**
 * Callback types for progress events.
 */
export type ProgressCallback = (progress: SemanticProgress) => void;

/**
 * Options for semantic search queries.
 */
export interface SemanticQueryOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum similarity score (default: config.similarityThreshold) */
  threshold?: number;
  /** Object IDs to exclude from results */
  excludeIds?: string[];
}

/**
 * Default query options.
 */
export const DEFAULT_QUERY_OPTIONS: Required<
  Omit<SemanticQueryOptions, 'excludeIds'>
> = {
  limit: 10,
  threshold: 0.2, // Lower threshold to capture conceptual relationships
};
