import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Frontiers } from 'loro-crdt';

/**
 * View types for the main content area
 */
export type ViewType =
  | 'inbox'
  | 'today'
  | 'daily-notes'
  | 'this-week'
  | 'overdue'
  | 'blocked'
  | 'eventually'
  | 'completed'
  | 'object'
  | 'settings'
  | 'time-machine'
  | 'search';

interface NavigationState {
  view: ViewType;
  objectId: string | null;
  /** Search query when view is 'search' */
  searchQuery: string | null;
  /** Object ID to filter Time Machine view */
  timeMachineFilter: string | null;
}

/**
 * Split pane mode
 */
export type SplitPaneMode = 'normal' | 'version-comparison';

/**
 * Split pane state for side-by-side view
 */
export interface SplitPaneState {
  /** Whether the split view is open */
  isOpen: boolean;
  /** ID of the object displayed in the secondary pane */
  objectId: string | null;
  /** Width of the secondary pane as a percentage (25-75) */
  width: number;
  /** Mode of the split pane */
  mode: SplitPaneMode;
  /** Frontier for historical version (when mode is 'version-comparison') */
  historicalFrontier: Frontiers | null;
  /** Timestamp for historical version (when mode is 'version-comparison') */
  historicalTimestamp: number | null;
}

interface NavigationContextValue {
  /** Current view being displayed */
  currentView: ViewType;
  /** ID of the currently selected object (when view is 'object') */
  selectedObjectId: string | null;
  /** Current search query (when view is 'search') */
  searchQuery: string | null;
  /** Object ID filter for Time Machine view */
  timeMachineObjectFilter: string | null;
  /** Navigate to an object detail view */
  navigateToObject: (objectId: string) => void;
  /** Navigate to a specific view */
  navigateToView: (view: ViewType) => void;
  /** Navigate to search view with optional initial query */
  navigateToSearch: (query?: string) => void;
  /** Navigate to Time Machine view with optional object filter */
  navigateToTimeMachine: (objectId?: string) => void;
  /** Go back to the previous view */
  navigateBack: () => void;
  /** Check if we can go back */
  canGoBack: boolean;
  /** Navigation history stack */
  navigationHistory: NavigationState[];

  // Split pane functionality
  /** Current split pane state */
  splitPane: SplitPaneState;
  /** Open an object in the secondary (split) pane */
  openInSplit: (objectId: string) => void;
  /** Close the split view */
  closeSplit: () => void;
  /** Set the width of the secondary pane (25-75%) */
  setSplitWidth: (width: number) => void;
  /** Swap primary and secondary pane objects */
  swapPanes: () => void;
  /** Open version comparison (current vs historical) */
  openVersionComparison: (
    objectId: string,
    frontier: Frontiers,
    timestamp: number
  ) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentState, setCurrentState] = useState<NavigationState>({
    view: 'inbox',
    objectId: null,
    searchQuery: null,
    timeMachineFilter: null,
  });
  const [history, setHistory] = useState<NavigationState[]>([]);

  // Split pane state
  const [splitPane, setSplitPaneState] = useState<SplitPaneState>({
    isOpen: false,
    objectId: null,
    width: 50,
    mode: 'normal',
    historicalFrontier: null,
    historicalTimestamp: null,
  });

  const navigateToObject = useCallback((objectId: string) => {
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view: 'object',
      objectId,
      searchQuery: null,
      timeMachineFilter: null,
    });
  }, [currentState]);

  const navigateToView = useCallback((view: ViewType) => {
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view,
      objectId: null,
      searchQuery: null,
      timeMachineFilter: null,
    });
  }, [currentState]);

  const navigateToSearch = useCallback((query?: string) => {
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view: 'search',
      objectId: null,
      searchQuery: query ?? null,
      timeMachineFilter: null,
    });
  }, [currentState]);

  const navigateToTimeMachine = useCallback((objectId?: string) => {
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view: 'time-machine',
      objectId: null,
      searchQuery: null,
      timeMachineFilter: objectId ?? null,
    });
  }, [currentState]);

  const navigateBack = useCallback(() => {
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentState(previous);
  }, [history]);

  // Split pane methods
  const openInSplit = useCallback((objectId: string) => {
    setSplitPaneState((prev) => ({
      ...prev,
      isOpen: true,
      objectId,
    }));
  }, []);

  const closeSplit = useCallback(() => {
    setSplitPaneState({
      isOpen: false,
      objectId: null,
      width: 50,
      mode: 'normal',
      historicalFrontier: null,
      historicalTimestamp: null,
    });
  }, []);

  const setSplitWidth = useCallback((width: number) => {
    // Clamp width between 25% and 75%
    const clampedWidth = Math.max(25, Math.min(75, width));
    setSplitPaneState((prev) => ({
      ...prev,
      width: clampedWidth,
    }));
  }, []);

  const swapPanes = useCallback(() => {
    if (!splitPane.objectId || !currentState.objectId) return;

    const tempId = currentState.objectId;

    // Navigate primary to the split object
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view: 'object',
      objectId: splitPane.objectId,
      searchQuery: null,
      timeMachineFilter: null,
    });

    // Update split to show the former primary object
    setSplitPaneState((prev) => ({
      ...prev,
      objectId: tempId,
    }));
  }, [splitPane.objectId, currentState]);

  const openVersionComparison = useCallback(
    (objectId: string, frontier: Frontiers, timestamp: number) => {
      // Navigate primary pane to the current version of the object
      setHistory((prev) => [...prev, currentState]);
      setCurrentState({
        view: 'object',
        objectId,
        searchQuery: null,
        timeMachineFilter: null,
      });

      // Open split pane with historical version
      setSplitPaneState({
        isOpen: true,
        objectId,
        width: 50,
        mode: 'version-comparison',
        historicalFrontier: frontier,
        historicalTimestamp: timestamp,
      });
    },
    [currentState]
  );

  return (
    <NavigationContext.Provider
      value={{
        currentView: currentState.view,
        selectedObjectId: currentState.objectId,
        searchQuery: currentState.searchQuery,
        timeMachineObjectFilter: currentState.timeMachineFilter,
        navigateToObject,
        navigateToView,
        navigateToSearch,
        navigateToTimeMachine,
        navigateBack,
        canGoBack: history.length > 0,
        navigationHistory: history,
        // Split pane
        splitPane,
        openInSplit,
        closeSplit,
        setSplitWidth,
        swapPanes,
        openVersionComparison,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
