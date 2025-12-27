import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
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
  /** Force a re-render after data changes */
  refreshData: () => void;
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

  const refreshData = () => {
    setRefreshCounter((c) => c + 1);
    // Trigger sync broadcast (debounced, no disk write)
    docStore.sync();
  };

  // Auto-save periodically
  useEffect(() => {
    if (!doc) return;

    const saveInterval = setInterval(async () => {
      try {
        await docStore.save();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 5000); // Save every 5 seconds

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
