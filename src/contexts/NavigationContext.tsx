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
  | 'tasks'          // NEW: Consolidated tasks view with tabs
  | 'today'          // DEPRECATED: Use 'tasks' instead
  | 'daily-notes'
  | 'this-week'      // DEPRECATED: Use 'tasks' instead
  | 'overdue'        // DEPRECATED: Use 'tasks' instead
  | 'waiting'        // NEW: Renamed from 'blocked' for clearer meaning
  | 'eventually'     // DEPRECATED: Use 'tasks' instead
  | 'completed'      // DEPRECATED: Use 'tasks' instead
  | 'object'
  | 'settings'
  | 'time-machine'
  | 'archive'
  | 'search'
  | 'saved-view'
  | 'type-browse';

interface NavigationState {
  view: ViewType;
  objectId: string | null;
  /** Search query when view is 'search' */
  searchQuery: string | null;
  /** Object ID to filter Time Machine view */
  timeMachineFilter: string | null;
  /** Saved view ID when view is 'saved-view' */
  savedViewId: string | null;
  /** Type ID when view is 'type-browse' */
  browseTypeId: string | null;
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
  /** Source context for returning to Time Machine */
  timeMachineContext: {
    selectedDate: string;
    changeIndex: number;
  } | null;
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
  /** Active saved view ID (when view is 'saved-view') */
  activeSavedViewId: string | null;
  /** Whether the BlockNote editor is currently focused */
  isEditorFocused: boolean;
  /** Set whether the BlockNote editor is focused */
  setEditorFocused: (focused: boolean) => void;
  /** Navigate to an object detail view */
  navigateToObject: (objectId: string) => void;
  /** Navigate to a specific view */
  navigateToView: (view: ViewType) => void;
  /** Navigate to search view with optional initial query */
  navigateToSearch: (query?: string) => void;
  /** Navigate to Time Machine view with optional object filter */
  navigateToTimeMachine: (objectId?: string) => void;
  /** Navigate to a saved view */
  navigateToSavedView: (viewId: string) => void;
  /** Navigate to browse objects by type */
  navigateToTypeBrowse: (typeId: string) => void;
  /** Type ID being browsed (when view is 'type-browse') */
  browseTypeId: string | null;
  /** Go back to the previous view */
  navigateBack: () => void;
  /** Go forward to the next view (after going back) */
  navigateForward: () => void;
  /** Check if we can go back */
  canGoBack: boolean;
  /** Check if we can go forward */
  canGoForward: boolean;
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
    timestamp: number,
    timeMachineContext?: { selectedDate: string; changeIndex: number }
  ) => void;
  /** Update the version being compared (for prev/next navigation) */
  updateVersionComparison: (frontier: Frontiers, timestamp: number) => void;
  /** Return to Time Machine with the stored context */
  returnToTimeMachine: () => void;
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
    savedViewId: null,
    browseTypeId: null,
  });
  const [history, setHistory] = useState<NavigationState[]>([]);
  const [forwardHistory, setForwardHistory] = useState<NavigationState[]>([]);

  // Split pane state
  const [splitPane, setSplitPaneState] = useState<SplitPaneState>({
    isOpen: false,
    objectId: null,
    width: 50,
    mode: 'normal',
    historicalFrontier: null,
    historicalTimestamp: null,
    timeMachineContext: null,
  });

  // Editor focus state for undo/redo routing
  const [isEditorFocused, setEditorFocused] = useState(false);

  // Helper to close split pane when leaving version comparison
  const closeVersionComparisonIfActive = useCallback(() => {
    if (splitPane.mode === 'version-comparison') {
      setSplitPaneState({
        isOpen: false,
        objectId: null,
        width: 50,
        mode: 'normal',
        historicalFrontier: null,
        historicalTimestamp: null,
        timeMachineContext: null,
      });
    }
  }, [splitPane.mode]);

  const navigateToObject = useCallback((objectId: string) => {
    // Close version comparison if navigating to a different object
    if (splitPane.mode === 'version-comparison' && splitPane.objectId !== objectId) {
      closeVersionComparisonIfActive();
    }
    setHistory((prev) => [...prev, currentState]);
    setForwardHistory([]); // Clear forward history on new navigation
    setCurrentState({
      view: 'object',
      objectId,
      searchQuery: null,
      timeMachineFilter: null,
      savedViewId: null,
      browseTypeId: null,
    });
  }, [currentState, splitPane.mode, splitPane.objectId, closeVersionComparisonIfActive]);

  const navigateToView = useCallback((view: ViewType) => {
    closeVersionComparisonIfActive();
    setHistory((prev) => [...prev, currentState]);
    setForwardHistory([]); // Clear forward history on new navigation
    setCurrentState({
      view,
      objectId: null,
      searchQuery: null,
      timeMachineFilter: null,
      savedViewId: null,
      browseTypeId: null,
    });
  }, [currentState, closeVersionComparisonIfActive]);

  const navigateToSearch = useCallback((query?: string) => {
    closeVersionComparisonIfActive();
    setHistory((prev) => [...prev, currentState]);
    setForwardHistory([]); // Clear forward history on new navigation
    setCurrentState({
      view: 'search',
      objectId: null,
      searchQuery: query ?? null,
      timeMachineFilter: null,
      savedViewId: null,
      browseTypeId: null,
    });
  }, [currentState, closeVersionComparisonIfActive]);

  const navigateToTimeMachine = useCallback((objectId?: string) => {
    closeVersionComparisonIfActive();
    setHistory((prev) => [...prev, currentState]);
    setForwardHistory([]); // Clear forward history on new navigation
    setCurrentState({
      view: 'time-machine',
      objectId: null,
      searchQuery: null,
      timeMachineFilter: objectId ?? null,
      savedViewId: null,
      browseTypeId: null,
    });
  }, [currentState, closeVersionComparisonIfActive]);

  const navigateToSavedView = useCallback((viewId: string) => {
    closeVersionComparisonIfActive();
    setHistory((prev) => [...prev, currentState]);
    setForwardHistory([]); // Clear forward history on new navigation
    setCurrentState({
      view: 'saved-view',
      objectId: null,
      searchQuery: null,
      timeMachineFilter: null,
      savedViewId: viewId,
      browseTypeId: null,
    });
  }, [currentState, closeVersionComparisonIfActive]);

  const navigateToTypeBrowse = useCallback((typeId: string) => {
    closeVersionComparisonIfActive();
    setHistory((prev) => [...prev, currentState]);
    setForwardHistory([]); // Clear forward history on new navigation
    setCurrentState({
      view: 'type-browse',
      objectId: null,
      searchQuery: null,
      timeMachineFilter: null,
      savedViewId: null,
      browseTypeId: typeId,
    });
  }, [currentState, closeVersionComparisonIfActive]);

  const navigateBack = useCallback(() => {
    if (history.length === 0) return;

    closeVersionComparisonIfActive();
    const previous = history[history.length - 1];
    setForwardHistory((prev) => [...prev, currentState]); // Push current to forward
    setHistory((prev) => prev.slice(0, -1));
    setCurrentState(previous);
  }, [history, currentState, closeVersionComparisonIfActive]);

  const navigateForward = useCallback(() => {
    if (forwardHistory.length === 0) return;

    closeVersionComparisonIfActive();
    const next = forwardHistory[forwardHistory.length - 1];
    setHistory((prev) => [...prev, currentState]); // Push current to back history
    setForwardHistory((prev) => prev.slice(0, -1));
    setCurrentState(next);
  }, [forwardHistory, currentState, closeVersionComparisonIfActive]);

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
      timeMachineContext: null,
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
      savedViewId: null,
      browseTypeId: null,
    });

    // Update split to show the former primary object
    setSplitPaneState((prev) => ({
      ...prev,
      objectId: tempId,
    }));
  }, [splitPane.objectId, currentState]);

  const openVersionComparison = useCallback(
    (
      objectId: string,
      frontier: Frontiers,
      timestamp: number,
      timeMachineContext?: { selectedDate: string; changeIndex: number }
    ) => {
      // Navigate primary pane to the current version of the object
      setHistory((prev) => [...prev, currentState]);
      setCurrentState({
        view: 'object',
        objectId,
        searchQuery: null,
        timeMachineFilter: null,
        savedViewId: null,
        browseTypeId: null,
      });

      // Open split pane with historical version
      setSplitPaneState({
        isOpen: true,
        objectId,
        width: 50,
        mode: 'version-comparison',
        historicalFrontier: frontier,
        historicalTimestamp: timestamp,
        timeMachineContext: timeMachineContext ?? null,
      });
    },
    [currentState]
  );

  const updateVersionComparison = useCallback(
    (frontier: Frontiers, timestamp: number) => {
      setSplitPaneState((prev) => ({
        ...prev,
        historicalFrontier: frontier,
        historicalTimestamp: timestamp,
      }));
    },
    []
  );

  const returnToTimeMachine = useCallback(() => {
    // Close split pane first
    setSplitPaneState({
      isOpen: false,
      objectId: null,
      width: 50,
      mode: 'normal',
      historicalFrontier: null,
      historicalTimestamp: null,
      timeMachineContext: null,
    });

    // Navigate back to time machine
    // This will use the last time-machine entry in history
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      if (lastState.view === 'time-machine') {
        setHistory((prev) => prev.slice(0, -1));
        setCurrentState(lastState);
        return;
      }
    }

    // Fallback: navigate to time machine with context date if available
    setCurrentState({
      view: 'time-machine',
      objectId: null,
      searchQuery: null,
      timeMachineFilter: null,
      savedViewId: null,
      browseTypeId: null,
    });
  }, [history]);

  return (
    <NavigationContext.Provider
      value={{
        currentView: currentState.view,
        selectedObjectId: currentState.objectId,
        searchQuery: currentState.searchQuery,
        timeMachineObjectFilter: currentState.timeMachineFilter,
        activeSavedViewId: currentState.savedViewId,
        isEditorFocused,
        setEditorFocused,
        navigateToObject,
        navigateToView,
        navigateToSearch,
        navigateToTimeMachine,
        navigateToSavedView,
        navigateToTypeBrowse,
        browseTypeId: currentState.browseTypeId,
        navigateBack,
        navigateForward,
        canGoBack: history.length > 0,
        canGoForward: forwardHistory.length > 0,
        navigationHistory: history,
        // Split pane
        splitPane,
        openInSplit,
        closeSplit,
        setSplitWidth,
        swapPanes,
        openVersionComparison,
        updateVersionComparison,
        returnToTimeMachine,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
