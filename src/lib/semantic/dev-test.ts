/**
 * Semantic Search Dev Test Interface
 *
 * Exposes semantic search functionality to the browser console for testing.
 * Only active in development mode.
 */

import {
  createSemanticEngine,
  SemanticEngine,
  IndexableContent,
} from './engine';
import { embedText, getModelInfo, isModelLoaded } from './model';
import { chunkText } from './chunker';
import { cosineSimilarity } from './vector-index';
import { SemanticSearchResult, Embedding } from './types';

/**
 * Test interface exposed to window.semanticTest
 */
export interface SemanticTestInterface {
  /** Get or create the global engine */
  getEngine: () => SemanticEngine;

  /** Download and initialize the model */
  downloadModel: () => Promise<void>;

  /** Check if model is loaded */
  isModelLoaded: () => boolean;

  /** Get model info */
  getModelInfo: () => ReturnType<typeof getModelInfo>;

  /** Generate embedding for text */
  embed: (text: string) => Promise<Embedding>;

  /** Calculate similarity between two texts */
  similarity: (text1: string, text2: string) => Promise<number>;

  /** Chunk text for inspection */
  chunk: (text: string, maxSize?: number) => ReturnType<typeof chunkText>;

  /** Index sample content */
  indexSamples: () => Promise<void>;

  /** Search for similar content */
  search: (query: string, limit?: number) => Promise<SemanticSearchResult[]>;

  /** Find similar to an object */
  findSimilar: (objectId: string, limit?: number) => Promise<SemanticSearchResult[]>;

  /** Get engine stats */
  stats: () => ReturnType<SemanticEngine['getStats']>;

  /** Clear all data */
  clear: () => Promise<void>;
}

// Sample content for testing
const SAMPLE_CONTENT: IndexableContent[] = [
  {
    objectId: 'sample-1',
    title: 'Meeting Notes: Q4 Planning',
    content: 'Discussed roadmap priorities for Q4. Main focus areas include semantic search feature, sync improvements, and mobile support. Action items assigned to team members.',
  },
  {
    objectId: 'sample-2',
    title: 'Project Deadlines',
    content: 'Task due dates for the current sprint. Frontend work due Friday, backend integration Monday. Code review scheduled for Tuesday.',
  },
  {
    objectId: 'sample-3',
    title: 'Sprint Retrospective',
    content: 'Team retrospective notes. What went well: good collaboration, clear communication. Areas to improve: estimation accuracy, documentation.',
  },
  {
    objectId: 'sample-4',
    title: 'API Documentation',
    content: 'REST API endpoints for the sync service. GET /sync/status returns current sync state. POST /sync/push sends local changes to server.',
  },
  {
    objectId: 'sample-5',
    title: 'Bug Fix: Login Issues',
    content: 'Fixed authentication bug where users were logged out unexpectedly. Root cause was token expiration not being handled correctly. Added refresh token logic.',
  },
  {
    objectId: 'sample-6',
    title: 'Feature Request: Dark Mode',
    content: 'User requested dark mode support for the application. Should respect system preferences and allow manual override. Consider implementing theme context.',
  },
  {
    objectId: 'sample-7',
    title: 'Team Sync Call Summary',
    content: 'Weekly standup discussion points. Progress on current tasks, blockers identified, upcoming deadlines reviewed. Next meeting scheduled for Thursday.',
  },
  {
    objectId: 'sample-8',
    title: 'Database Migration Plan',
    content: 'Steps to migrate from SQLite to PostgreSQL. Backup existing data, update connection strings, run migration scripts, verify data integrity.',
  },
];

/**
 * Create the test interface.
 */
function createTestInterface(): SemanticTestInterface {
  let engine: SemanticEngine | null = null;

  return {
    getEngine: () => {
      if (!engine) {
        engine = createSemanticEngine({ enabled: true });
      }
      return engine;
    },

    downloadModel: async () => {
      const eng = createTestInterface().getEngine();
      console.log('Downloading model...');
      await eng.initialize((progress) => {
        console.log(`[${progress.operation}] ${progress.percent}% - ${progress.message}`);
      });
      console.log('Model ready!');
    },

    isModelLoaded,
    getModelInfo,

    embed: async (text: string) => {
      console.log(`Generating embedding for: "${text.slice(0, 50)}..."`);
      const embedding = await embedText(text);
      console.log(`Generated ${embedding.length}-dimensional embedding`);
      return embedding;
    },

    similarity: async (text1: string, text2: string) => {
      console.log('Calculating similarity...');
      const [e1, e2] = await Promise.all([
        embedText(text1),
        embedText(text2),
      ]);
      const score = cosineSimilarity(e1, e2);
      console.log(`Similarity: ${(score * 100).toFixed(1)}%`);
      return score;
    },

    chunk: (text: string, maxSize: number = 200) => {
      const chunks = chunkText(text, { maxChunkSize: maxSize });
      console.log(`Created ${chunks.length} chunks:`);
      chunks.forEach((c, i) => {
        console.log(`  [${i}] (${c.text.length} chars): "${c.text.slice(0, 50)}..."`);
      });
      return chunks;
    },

    indexSamples: async () => {
      const eng = createTestInterface().getEngine();

      // Initialize if needed
      if (eng.status !== 'ready') {
        await eng.initialize((progress) => {
          console.log(`[${progress.operation}] ${progress.percent}% - ${progress.message}`);
        });
      }

      console.log('Indexing sample content...');
      await eng.indexContent(SAMPLE_CONTENT, (progress) => {
        console.log(`[${progress.operation}] ${progress.percent}% - ${progress.message}`);
      });
      console.log('Sample content indexed!');
    },

    search: async (query: string, limit: number = 5) => {
      const eng = createTestInterface().getEngine();
      console.log(`Searching for: "${query}"`);
      const results = await eng.search(query, { limit, threshold: 0.3 });
      console.log(`Found ${results.length} results:`);
      results.forEach((r, i) => {
        const sample = SAMPLE_CONTENT.find(s => s.objectId === r.objectId);
        console.log(`  ${i + 1}. [${(r.score * 100).toFixed(1)}%] ${sample?.title ?? r.objectId}`);
      });
      return results;
    },

    findSimilar: async (objectId: string, limit: number = 5) => {
      const eng = createTestInterface().getEngine();
      console.log(`Finding similar to: ${objectId}`);
      const results = await eng.findSimilar(objectId, { limit, threshold: 0.3 });
      console.log(`Found ${results.length} similar items:`);
      results.forEach((r, i) => {
        const sample = SAMPLE_CONTENT.find(s => s.objectId === r.objectId);
        console.log(`  ${i + 1}. [${(r.score * 100).toFixed(1)}%] ${sample?.title ?? r.objectId}`);
      });
      return results;
    },

    stats: () => {
      const eng = createTestInterface().getEngine();
      const stats = eng.getStats();
      console.log('Engine Stats:', stats);
      return stats;
    },

    clear: async () => {
      const eng = createTestInterface().getEngine();
      await eng.cleanup();
      console.log('Cleared all semantic search data');
    },
  };
}

/**
 * Initialize dev test interface if in development mode.
 */
export function initDevTestInterface(): void {
  // Check for development mode - works with Vite
  const isDev = typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

  if (isDev) {
    const testInterface = createTestInterface();
    (window as unknown as { semanticTest: SemanticTestInterface }).semanticTest = testInterface;

    console.log(
      '%c🔍 Semantic Search Dev Tools Available',
      'color: #4a9eff; font-weight: bold; font-size: 14px;'
    );
    console.log(
      '%cUse window.semanticTest to test semantic search functionality:',
      'color: #888;'
    );
    console.log(`
  await semanticTest.downloadModel()    // Download the ML model
  await semanticTest.embed("text")      // Generate embedding for text
  await semanticTest.similarity(a, b)   // Compare two texts
  semanticTest.chunk("long text")       // Test text chunking
  await semanticTest.indexSamples()     // Index sample content
  await semanticTest.search("query")    // Search indexed content
  await semanticTest.findSimilar("id")  // Find similar objects
  semanticTest.stats()                  // View engine stats
  await semanticTest.clear()            // Clear all data
    `);
  }
}
