import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import type { LoroDoc } from 'loro-crdt';
import {
  LoroDocStore,
  ObjectStore,
  createObjectStore,
  RelationHelper,
  createRelationHelper,
} from '@/lib/loro';
import {
  createTypeRegistry,
  builtInTypes,
  type TypeRegistry,
} from '@/lib/types';

interface ObjectContextValue {
  /** The Loro document store */
  docStore: LoroDocStore;
  /** The main Loro document */
  doc: LoroDoc | null;
  /** Object CRUD operations */
  store: ObjectStore | null;
  /** Type definitions registry */
  typeRegistry: TypeRegistry;
  /** Relation and backlink utilities */
  relationHelper: RelationHelper | null;
  /** Whether the store is still initializing */
  isLoading: boolean;
  /** Any initialization error */
  error: Error | null;
  /** Force a re-render after data changes (also triggers debounced save) */
  refreshData: () => void;
  /** Immediately save to disk (for critical operations) */
  saveNow: () => Promise<void>;
  /** Trigger a debounced save without re-render (for content changes) */
  scheduleSave: () => void;
}

const ObjectContext = createContext<ObjectContextValue | null>(null);

interface ObjectProviderProps {
  children: ReactNode;
}

export function ObjectProvider({ children }: ObjectProviderProps) {
  const [docStore] = useState(() => new LoroDocStore());
  const [doc, setDoc] = useState<LoroDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Create type registry with built-in types
  const typeRegistry = useMemo(() => {
    const registry = createTypeRegistry();
    for (const type of builtInTypes) {
      registry.register(type);
    }
    return registry;
  }, []);

  // Initialize the document store
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        await docStore.initialize();

        // Load saved data from disk
        await docStore.load();

        // Get or create the main document
        const mainDoc = docStore.getOrCreateDocument('main');
        setDoc(mainDoc);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [docStore]);

  // Create ObjectStore and RelationHelper when doc is ready
  const store = useMemo(() => {
    if (!doc) return null;
    return createObjectStore(doc, typeRegistry);
  }, [doc, typeRegistry, refreshCounter]);

  const relationHelper = useMemo(() => {
    if (!store) return null;
    return createRelationHelper(store, typeRegistry);
  }, [store, typeRegistry]);

  // Debounced save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save - triggers 300ms after last change
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      try {
        await docStore.save();
      } catch (err) {
        console.error('Debounced save failed:', err);
      }
    }, 300);
  }, [docStore]);

  const refreshData = useCallback(() => {
    setRefreshCounter((c) => c + 1);
    // Trigger sync broadcast (debounced, no disk write)
    docStore.sync();
    // Trigger debounced save to disk
    debouncedSave();
  }, [docStore, debouncedSave]);

  // Immediate save for critical operations
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      await docStore.save();
    } catch (err) {
      console.error('Immediate save failed:', err);
    }
  }, [docStore]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Backup auto-save every 30 seconds (safety net)
  useEffect(() => {
    if (!doc) return;

    const saveInterval = setInterval(async () => {
      try {
        await docStore.save();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 30000); // Save every 30 seconds as backup

    return () => clearInterval(saveInterval);
  }, [doc, docStore]);

  return (
    <ObjectContext.Provider
      value={{
        docStore,
        doc,
        store,
        typeRegistry,
        relationHelper,
        isLoading,
        error,
        refreshData,
        saveNow,
        scheduleSave: debouncedSave,
      }}
    >
      {children}
    </ObjectContext.Provider>
  );
}

export function useObjects(): ObjectContextValue {
  const context = useContext(ObjectContext);
  if (!context) {
    throw new Error('useObjects must be used within an ObjectProvider');
  }
  return context;
}

/**
 * Convenience hook to get just the store with null check
 */
export function useObjectStore(): ObjectStore {
  const { store, isLoading } = useObjects();
  if (!store) {
    throw new Error(
      isLoading
        ? 'ObjectStore is still loading'
        : 'ObjectStore failed to initialize'
    );
  }
  return store;
}

/**
 * Convenience hook to get the type registry
 */
export function useTypeRegistry(): TypeRegistry {
  const { typeRegistry } = useObjects();
  return typeRegistry;
}

/**
 * Convenience hook to get the relation helper with null check
 */
export function useRelationHelper(): RelationHelper {
  const { relationHelper, isLoading } = useObjects();
  if (!relationHelper) {
    throw new Error(
      isLoading
        ? 'RelationHelper is still loading'
        : 'RelationHelper failed to initialize'
    );
  }
  return relationHelper;
}
