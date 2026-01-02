import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { UndoManager } from 'loro-crdt';
import { useObjects } from './ObjectContext';
import { useToast } from './ToastContext';

interface UndoContextValue {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Perform undo operation */
  undo: () => boolean;
  /** Perform redo operation */
  redo: () => boolean;
  /** Start grouping operations into a single undo step */
  groupStart: () => void;
  /** End grouping operations */
  groupEnd: () => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

interface UndoProviderProps {
  children: ReactNode;
}

export function UndoProvider({ children }: UndoProviderProps) {
  const { doc, refreshData } = useObjects();
  const { addToast } = useToast();
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize UndoManager when doc is ready
  useEffect(() => {
    if (!doc) {
      undoManagerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    // Create UndoManager with configuration
    const undoManager = new UndoManager(doc, {
      mergeInterval: 1000, // Group changes within 1 second
      maxUndoSteps: 100,   // Keep last 100 undo steps
    });

    // Set up onPop callback for toast notifications
    undoManager.setOnPop((isUndo) => {
      // isUndo is true for undo, false for redo
      addToast({
        type: 'info',
        message: isUndo ? 'Undid last action' : 'Redid last action',
        duration: 2000,
      });
    });

    undoManagerRef.current = undoManager;

    // Update state
    setCanUndo(undoManager.canUndo());
    setCanRedo(undoManager.canRedo());

    // Subscribe to document changes to update canUndo/canRedo
    const unsubscribe = doc.subscribe((event) => {
      if (event.by === 'local' || event.by === 'import') {
        // Update after any change
        setCanUndo(undoManager.canUndo());
        setCanRedo(undoManager.canRedo());
      }
    });

    return () => {
      unsubscribe();
      undoManager.free();
      undoManagerRef.current = null;
    };
  }, [doc, addToast]);

  const undo = useCallback((): boolean => {
    const undoManager = undoManagerRef.current;
    if (!undoManager || !undoManager.canUndo()) {
      return false;
    }

    const result = undoManager.undo();
    if (result) {
      // Refresh the UI to reflect the undone changes
      refreshData();
      // Update state
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    }
    return result;
  }, [refreshData]);

  const redo = useCallback((): boolean => {
    const undoManager = undoManagerRef.current;
    if (!undoManager || !undoManager.canRedo()) {
      return false;
    }

    const result = undoManager.redo();
    if (result) {
      // Refresh the UI to reflect the redone changes
      refreshData();
      // Update state
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    }
    return result;
  }, [refreshData]);

  const groupStart = useCallback(() => {
    undoManagerRef.current?.groupStart();
  }, []);

  const groupEnd = useCallback(() => {
    undoManagerRef.current?.groupEnd();
  }, []);

  return (
    <UndoContext.Provider
      value={{
        canUndo,
        canRedo,
        undo,
        redo,
        groupStart,
        groupEnd,
      }}
    >
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}

/**
 * Safe version that returns null if not in provider
 */
export function useUndoSafe(): UndoContextValue | null {
  return useContext(UndoContext);
}
