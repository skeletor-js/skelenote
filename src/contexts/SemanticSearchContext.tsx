/**
 * Semantic Search Context
 *
 * Manages semantic search feature state including enable/disable,
 * indexing progress, and engine status.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  SemanticEngine,
  createSemanticEngine,
  SemanticEngineStatus,
  SemanticProgress,
  IndexableContent,
} from '@/lib/semantic';

const STORAGE_KEY = 'skelenote:semanticSearchEnabled';

interface SemanticSearchContextValue {
  /** Whether semantic search is enabled */
  isEnabled: boolean;
  /** Current engine status */
  status: SemanticEngineStatus;
  /** Number of indexed objects */
  indexedCount: number;
  /** Current progress (download/indexing) */
  progress: SemanticProgress | null;
  /** Error message if any */
  error: string | null;
  /** Enable semantic search (triggers download and indexing) */
  enable: (content: IndexableContent[]) => Promise<void>;
  /** Disable semantic search */
  disable: (cleanup?: boolean) => Promise<void>;
  /** Rebuild the index */
  rebuildIndex: (content: IndexableContent[]) => Promise<void>;
  /** Get the engine instance (for search operations) */
  getEngine: () => SemanticEngine | null;
}

const SemanticSearchContext = createContext<SemanticSearchContextValue | null>(null);

function getInitialEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
  return false;
}

interface SemanticSearchProviderProps {
  children: ReactNode;
}

export function SemanticSearchProvider({ children }: SemanticSearchProviderProps) {
  const [engine, setEngine] = useState<SemanticEngine | null>(null);
  const [isEnabled, setIsEnabled] = useState(getInitialEnabled);
  const [status, setStatus] = useState<SemanticEngineStatus>('disabled');
  const [indexedCount, setIndexedCount] = useState(0);
  const [progress, setProgress] = useState<SemanticProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine if previously enabled
  useEffect(() => {
    if (isEnabled && !engine) {
      const eng = createSemanticEngine({ enabled: true });
      setEngine(eng);

      // Subscribe to status changes
      const unsubscribe = eng.onStatusChange((newStatus) => {
        setStatus(newStatus);
        setIndexedCount(eng.indexedCount);
      });

      // Initialize (load model and existing embeddings)
      eng.initialize((prog) => setProgress(prog))
        .then(() => {
          setStatus(eng.status);
          setIndexedCount(eng.indexedCount);
          setProgress(null);
        })
        .catch((err) => {
          setError(err.message);
          setProgress(null);
        });

      return () => {
        unsubscribe();
      };
    }
  }, [isEnabled, engine]);

  const enable = useCallback(async (content: IndexableContent[]) => {
    setError(null);
    setProgress({ operation: 'load', percent: 0, message: 'Initializing...' });

    try {
      // Create and initialize engine
      const eng = createSemanticEngine({ enabled: true });
      setEngine(eng);

      // Subscribe to status changes
      eng.onStatusChange((newStatus) => {
        setStatus(newStatus);
        setIndexedCount(eng.indexedCount);
      });

      // Initialize (downloads model if needed)
      await eng.initialize((prog) => setProgress(prog));

      // Index content
      if (content.length > 0) {
        await eng.indexContent(content, (prog) => setProgress(prog));
      }

      // Save enabled state
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsEnabled(true);
      setStatus(eng.status);
      setIndexedCount(eng.indexedCount);
      setProgress(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setProgress(null);
      throw err;
    }
  }, []);

  const disable = useCallback(async (cleanup: boolean = false) => {
    if (engine) {
      await engine.disable(cleanup);
    }

    localStorage.removeItem(STORAGE_KEY);
    setIsEnabled(false);
    setStatus('disabled');
    setIndexedCount(0);
    setProgress(null);
    setError(null);

    if (cleanup) {
      setEngine(null);
    }
  }, [engine]);

  const rebuildIndex = useCallback(async (content: IndexableContent[]) => {
    if (!engine) {
      throw new Error('Semantic search is not enabled');
    }

    setError(null);
    await engine.rebuildIndex(content, (prog) => setProgress(prog));
    setIndexedCount(engine.indexedCount);
    setProgress(null);
  }, [engine]);

  const getEngine = useCallback(() => engine, [engine]);

  return (
    <SemanticSearchContext.Provider
      value={{
        isEnabled,
        status,
        indexedCount,
        progress,
        error,
        enable,
        disable,
        rebuildIndex,
        getEngine,
      }}
    >
      {children}
    </SemanticSearchContext.Provider>
  );
}

export function useSemanticSearch(): SemanticSearchContextValue {
  const context = useContext(SemanticSearchContext);
  if (!context) {
    throw new Error('useSemanticSearch must be used within a SemanticSearchProvider');
  }
  return context;
}

export function useSemanticSearchSafe(): SemanticSearchContextValue | null {
  return useContext(SemanticSearchContext);
}
