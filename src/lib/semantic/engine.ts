/**
 * Semantic Search Engine
 *
 * Coordinates model, vector index, and storage for semantic search functionality.
 * Handles indexing, querying, and incremental updates.
 */

import {
  SemanticSearchConfig,
  SemanticEngineStatus,
  SemanticSearchResult,
  SemanticQueryOptions,
  ProgressCallback,
  EmbeddingRecord,
  DEFAULT_SEMANTIC_CONFIG,
  Embedding,
} from './types';
import { chunkText, needsChunking } from './chunker';
import {
  embedText,
  embedBatch,
  getEmbeddingPipeline,
  unloadModel,
  getModelInfo,
} from './model';
import { VectorIndex, createVectorIndex } from './vector-index';
import {
  EmbeddingStorage,
  createEmbeddingStorage,
  hashContent,
} from './storage';

/**
 * Content to be indexed.
 */
export interface IndexableContent {
  objectId: string;
  title: string;
  content: string;
}

/**
 * Semantic search engine state.
 */
interface EngineState {
  status: SemanticEngineStatus;
  config: SemanticSearchConfig;
  indexedCount: number;
  lastIndexedAt: number | null;
  error: string | null;
}

/**
 * Semantic Search Engine
 *
 * Main class coordinating all semantic search functionality.
 */
export class SemanticEngine {
  private vectorIndex: VectorIndex;
  private storage: EmbeddingStorage;
  private state: EngineState;
  private statusListeners: Set<(status: SemanticEngineStatus) => void> =
    new Set();

  constructor(config: Partial<SemanticSearchConfig> = {}) {
    this.vectorIndex = createVectorIndex();
    this.storage = createEmbeddingStorage();
    this.state = {
      status: 'disabled',
      config: { ...DEFAULT_SEMANTIC_CONFIG, ...config },
      indexedCount: 0,
      lastIndexedAt: null,
      error: null,
    };
  }

  /**
   * Get current engine status.
   */
  get status(): SemanticEngineStatus {
    return this.state.status;
  }

  /**
   * Get current configuration.
   */
  get config(): SemanticSearchConfig {
    return this.state.config;
  }

  /**
   * Get number of indexed objects.
   */
  get indexedCount(): number {
    return this.state.indexedCount;
  }

  /**
   * Check if the engine is ready for queries.
   */
  get isReady(): boolean {
    return this.state.status === 'ready';
  }

  /**
   * Subscribe to status changes.
   */
  onStatusChange(listener: (status: SemanticEngineStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Update status and notify listeners.
   */
  private setStatus(status: SemanticEngineStatus): void {
    this.state.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (e) {
        console.error('Status listener error:', e);
      }
    }
  }

  /**
   * Initialize the engine.
   * Downloads model if needed, loads embeddings from storage, builds index.
   */
  async initialize(onProgress?: ProgressCallback): Promise<void> {
    if (!this.state.config.enabled) {
      this.setStatus('disabled');
      return;
    }

    try {
      // Initialize storage
      await this.storage.initialize();

      // Download/load model
      this.setStatus('downloading');
      await getEmbeddingPipeline(this.state.config.modelId, onProgress);

      this.setStatus('loading');
      onProgress?.({
        operation: 'load',
        percent: 50,
        message: 'Loading embeddings from storage...',
      });

      // Load existing embeddings into index
      const records = await this.storage.getAll();
      for (const record of records) {
        this.vectorIndex.add(record.objectId, record.embedding);
      }

      this.state.indexedCount = records.length;
      this.state.lastIndexedAt =
        await this.storage.getMetadata<number>('lastIndexedAt');

      onProgress?.({
        operation: 'load',
        percent: 100,
        message: `Loaded ${records.length} embeddings`,
      });

      this.setStatus('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.error = message;
      this.setStatus('error');
      throw error;
    }
  }

  /**
   * Index content from objects.
   * Can be used for initial indexing or re-indexing.
   */
  async indexContent(
    items: IndexableContent[],
    onProgress?: ProgressCallback
  ): Promise<void> {
    if (!this.state.config.enabled) {
      throw new Error('Semantic search is not enabled');
    }

    this.setStatus('indexing');
    const modelVersion = this.state.config.modelId;

    try {
      // Get existing embeddings to detect changes
      const existingIds = await this.storage.getAllObjectIds();
      const existingSet = new Set(existingIds);

      // Determine which items need indexing
      const itemsToIndex: IndexableContent[] = [];
      const itemsToCheck: IndexableContent[] = [];

      for (const item of items) {
        if (!existingSet.has(item.objectId)) {
          itemsToIndex.push(item);
        } else {
          itemsToCheck.push(item);
        }
      }

      // Check for content changes in existing items
      for (const item of itemsToCheck) {
        const existing = await this.storage.get(item.objectId);
        const currentHash = hashContent(item.title + item.content);

        if (
          !existing ||
          existing.contentHash !== currentHash ||
          existing.modelVersion !== modelVersion
        ) {
          itemsToIndex.push(item);
        }
      }

      onProgress?.({
        operation: 'index',
        percent: 0,
        current: 0,
        total: itemsToIndex.length,
        message: `Found ${itemsToIndex.length} items to index`,
      });

      if (itemsToIndex.length === 0) {
        this.setStatus('ready');
        return;
      }

      // Process items in batches
      const batchSize = 8;
      const records: EmbeddingRecord[] = [];

      for (let i = 0; i < itemsToIndex.length; i += batchSize) {
        const batch = itemsToIndex.slice(i, i + batchSize);

        // Prepare texts for embedding
        const texts = batch.map((item) => {
          const fullText = `${item.title}\n\n${item.content}`.trim();

          // If content is very long, use first chunk only for now
          // (Future: store multiple embeddings per object)
          if (needsChunking(fullText)) {
            const chunks = chunkText(fullText);
            return chunks[0]?.text ?? fullText.slice(0, 512);
          }
          return fullText;
        });

        // Generate embeddings
        const embeddings = await embedBatch(texts, modelVersion);

        // Create records
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embedding = embeddings[j];
          const contentHash = hashContent(item.title + item.content);

          records.push({
            objectId: item.objectId,
            embedding,
            contentHash,
            modelVersion,
            updatedAt: Date.now(),
          });

          // Add to vector index
          this.vectorIndex.add(item.objectId, embedding);
        }

        onProgress?.({
          operation: 'index',
          percent: Math.round(((i + batch.length) / itemsToIndex.length) * 100),
          current: i + batch.length,
          total: itemsToIndex.length,
          message: `Indexed ${i + batch.length} of ${itemsToIndex.length} items`,
        });
      }

      // Save to storage
      await this.storage.saveBatch(records);
      await this.storage.setMetadata('lastIndexedAt', Date.now());

      this.state.indexedCount = this.vectorIndex.size;
      this.state.lastIndexedAt = Date.now();

      onProgress?.({
        operation: 'index',
        percent: 100,
        current: itemsToIndex.length,
        total: itemsToIndex.length,
        message: 'Indexing complete',
      });

      this.setStatus('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.error = message;
      this.setStatus('error');
      throw error;
    }
  }

  /**
   * Index a single item (for incremental updates).
   */
  async indexSingle(item: IndexableContent): Promise<void> {
    if (!this.state.config.enabled || this.state.status !== 'ready') {
      return;
    }

    const fullText = `${item.title}\n\n${item.content}`.trim();
    const contentHash = hashContent(item.title + item.content);

    // Check if update is needed
    const existing = await this.storage.get(item.objectId);
    if (existing && existing.contentHash === contentHash) {
      return; // No change
    }

    // Generate embedding
    let text = fullText;
    if (needsChunking(fullText)) {
      const chunks = chunkText(fullText);
      text = chunks[0]?.text ?? fullText.slice(0, 512);
    }

    const embedding = await embedText(text, this.state.config.modelId);

    // Save
    const record: EmbeddingRecord = {
      objectId: item.objectId,
      embedding,
      contentHash,
      modelVersion: this.state.config.modelId,
      updatedAt: Date.now(),
    };

    await this.storage.save(record);
    this.vectorIndex.add(item.objectId, embedding);
    this.state.indexedCount = this.vectorIndex.size;
  }

  /**
   * Remove an object from the index.
   */
  async removeFromIndex(objectId: string): Promise<void> {
    await this.storage.delete(objectId);
    this.vectorIndex.remove(objectId);
    this.state.indexedCount = this.vectorIndex.size;
  }

  /**
   * Search for similar content.
   */
  async search(
    query: string,
    options: SemanticQueryOptions = {}
  ): Promise<SemanticSearchResult[]> {
    if (!this.isReady) {
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await embedText(query, this.state.config.modelId);

    // Search vector index
    return this.vectorIndex.search(queryEmbedding, {
      threshold: options.threshold ?? this.state.config.similarityThreshold,
      ...options,
    });
  }

  /**
   * Find objects similar to a given object.
   */
  async findSimilar(
    objectId: string,
    options: SemanticQueryOptions = {}
  ): Promise<SemanticSearchResult[]> {
    if (!this.isReady) {
      return [];
    }

    return this.vectorIndex.findSimilar(objectId, {
      threshold: options.threshold ?? this.state.config.similarityThreshold,
      ...options,
    });
  }

  /**
   * Get embedding for a specific text (for testing/debugging).
   */
  async getEmbedding(text: string): Promise<Embedding> {
    return embedText(text, this.state.config.modelId);
  }

  /**
   * Enable semantic search.
   */
  async enable(): Promise<void> {
    this.state.config.enabled = true;
    await this.initialize();
  }

  /**
   * Disable semantic search.
   * Optionally cleans up stored data.
   */
  async disable(cleanup: boolean = false): Promise<void> {
    this.state.config.enabled = false;
    this.setStatus('disabled');

    if (cleanup) {
      await this.cleanup();
    }
  }

  /**
   * Clean up all semantic search data.
   */
  async cleanup(): Promise<void> {
    this.vectorIndex.clear();
    await this.storage.clear();
    await unloadModel();
    this.state.indexedCount = 0;
    this.state.lastIndexedAt = null;
  }

  /**
   * Get engine statistics.
   */
  getStats(): {
    status: SemanticEngineStatus;
    indexedCount: number;
    lastIndexedAt: number | null;
    modelLoaded: boolean;
    modelId: string;
    error: string | null;
  } {
    const modelInfo = getModelInfo();
    return {
      status: this.state.status,
      indexedCount: this.state.indexedCount,
      lastIndexedAt: this.state.lastIndexedAt,
      modelLoaded: modelInfo.isLoaded,
      modelId: this.state.config.modelId,
      error: this.state.error,
    };
  }

  /**
   * Rebuild the entire index.
   */
  async rebuildIndex(
    items: IndexableContent[],
    onProgress?: ProgressCallback
  ): Promise<void> {
    // Clear existing data
    this.vectorIndex.clear();
    await this.storage.clear();
    this.state.indexedCount = 0;

    // Re-index everything
    await this.indexContent(items, onProgress);
  }
}

/**
 * Create a new SemanticEngine instance.
 */
export function createSemanticEngine(
  config: Partial<SemanticSearchConfig> = {}
): SemanticEngine {
  return new SemanticEngine(config);
}

// Singleton instance for app-wide use
let globalEngine: SemanticEngine | null = null;

/**
 * Get the global semantic engine instance.
 */
export function getSemanticEngine(): SemanticEngine {
  if (!globalEngine) {
    globalEngine = createSemanticEngine();
  }
  return globalEngine;
}

/**
 * Set a custom global engine (for testing).
 */
export function setSemanticEngine(engine: SemanticEngine | null): void {
  globalEngine = engine;
}
