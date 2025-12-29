/**
 * Embedding Model Wrapper
 *
 * Wraps Transformers.js for local embedding model inference.
 * Uses all-MiniLM-L6-v2 model by default (384 dimensions, ~23MB).
 */

import { pipeline, env } from '@xenova/transformers';
import {
  Embedding,
  EMBEDDING_DIMENSIONS,
  ProgressCallback,
  DEFAULT_SEMANTIC_CONFIG,
} from './types';

// Configure Transformers.js to use local cache
// In Tauri, models are cached in browser's IndexedDB/Cache API
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Pipeline type for embedding inference.
 * Using generic callable type since Transformers.js types vary by task.
 */
type EmbeddingPipeline = (
  text: string,
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array }>;

/**
 * Singleton embedding model instance.
 */
let embeddingPipeline: EmbeddingPipeline | null = null;
let isLoading = false;
let loadError: Error | null = null;
let currentModelId: string | null = null;

/**
 * Get or create the embedding pipeline.
 * Downloads the model on first use if not cached.
 *
 * @param modelId - Model identifier (default: 'Xenova/all-MiniLM-L6-v2')
 * @param onProgress - Optional progress callback for download
 * @returns The embedding pipeline
 */
export async function getEmbeddingPipeline(
  modelId: string = DEFAULT_SEMANTIC_CONFIG.modelId,
  onProgress?: ProgressCallback
): Promise<EmbeddingPipeline> {
  // Return cached pipeline if same model
  if (embeddingPipeline && currentModelId === modelId) {
    return embeddingPipeline;
  }

  // Wait if already loading
  if (isLoading) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!isLoading) {
          clearInterval(checkInterval);
          if (loadError) {
            reject(loadError);
          } else if (embeddingPipeline) {
            resolve(embeddingPipeline);
          } else {
            reject(new Error('Model loading failed'));
          }
        }
      }, 100);
    });
  }

  isLoading = true;
  loadError = null;

  try {
    onProgress?.({
      operation: 'load',
      percent: 0,
      message: 'Initializing embedding model...',
    });

    // Create feature-extraction pipeline
    embeddingPipeline = (await pipeline('feature-extraction', modelId, {
      progress_callback: (progress: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
        if (progress.status === 'download' && progress.progress !== undefined) {
          onProgress?.({
            operation: 'download',
            percent: Math.round(progress.progress),
            bytesDownloaded: progress.loaded,
            bytesTotal: progress.total,
            message: `Downloading ${progress.file || 'model'}...`,
          });
        } else if (progress.status === 'init') {
          onProgress?.({
            operation: 'load',
            percent: 50,
            message: 'Loading model into memory...',
          });
        } else if (progress.status === 'ready') {
          onProgress?.({
            operation: 'load',
            percent: 100,
            message: 'Model ready',
          });
        }
      },
    })) as unknown as EmbeddingPipeline;

    currentModelId = modelId;

    onProgress?.({
      operation: 'load',
      percent: 100,
      message: 'Model loaded successfully',
    });

    return embeddingPipeline;
  } catch (error) {
    loadError = error instanceof Error ? error : new Error(String(error));
    throw loadError;
  } finally {
    isLoading = false;
  }
}

/**
 * Generate embedding for a single text.
 *
 * @param text - Text to embed
 * @param modelId - Model identifier
 * @returns Embedding vector
 */
export async function embedText(
  text: string,
  modelId: string = DEFAULT_SEMANTIC_CONFIG.modelId
): Promise<Embedding> {
  const pipe = await getEmbeddingPipeline(modelId);

  // Run inference
  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Extract embedding from output
  // The output is a nested tensor-like structure
  const data = output.data as Float32Array;

  // Verify dimensions
  if (data.length !== EMBEDDING_DIMENSIONS) {
    console.warn(
      `Unexpected embedding dimensions: ${data.length}, expected ${EMBEDDING_DIMENSIONS}`
    );
  }

  return data;
}

/**
 * Generate embeddings for multiple texts in batch.
 * More efficient than calling embedText multiple times.
 *
 * @param texts - Array of texts to embed
 * @param modelId - Model identifier
 * @param onProgress - Optional progress callback
 * @returns Array of embedding vectors
 */
export async function embedBatch(
  texts: string[],
  modelId: string = DEFAULT_SEMANTIC_CONFIG.modelId,
  onProgress?: ProgressCallback
): Promise<Embedding[]> {
  if (texts.length === 0) {
    return [];
  }

  const pipe = await getEmbeddingPipeline(modelId);
  const embeddings: Embedding[] = [];

  // Process in batches of 8 for memory efficiency
  const batchSize = 8;
  const totalBatches = Math.ceil(texts.length / batchSize);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);

    onProgress?.({
      operation: 'index',
      percent: Math.round((batchIndex / totalBatches) * 100),
      current: i,
      total: texts.length,
      message: `Embedding ${i + 1}-${Math.min(i + batchSize, texts.length)} of ${texts.length}...`,
    });

    // Process batch
    for (const text of batch) {
      const output = await pipe(text, {
        pooling: 'mean',
        normalize: true,
      });
      embeddings.push(output.data as Float32Array);
    }
  }

  onProgress?.({
    operation: 'index',
    percent: 100,
    current: texts.length,
    total: texts.length,
    message: 'Embedding complete',
  });

  return embeddings;
}

/**
 * Check if the model is loaded.
 */
export function isModelLoaded(): boolean {
  return embeddingPipeline !== null;
}

/**
 * Unload the model to free memory.
 */
export async function unloadModel(): Promise<void> {
  if (embeddingPipeline) {
    // Transformers.js doesn't have explicit dispose, but we can clear the reference
    embeddingPipeline = null;
    currentModelId = null;
  }
}

/**
 * Get information about the current model state.
 */
export function getModelInfo(): {
  isLoaded: boolean;
  isLoading: boolean;
  modelId: string | null;
  error: string | null;
} {
  return {
    isLoaded: embeddingPipeline !== null,
    isLoading,
    modelId: currentModelId,
    error: loadError?.message ?? null,
  };
}
