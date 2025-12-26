import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

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
  | 'object';

interface NavigationState {
  view: ViewType;
  objectId: string | null;
}

interface NavigationContextValue {
  /** Current view being displayed */
  currentView: ViewType;
  /** ID of the currently selected object (when view is 'object') */
  selectedObjectId: string | null;
  /** Navigate to an object detail view */
  navigateToObject: (objectId: string) => void;
  /** Navigate to a specific view */
  navigateToView: (view: ViewType) => void;
  /** Go back to the previous view */
  navigateBack: () => void;
  /** Check if we can go back */
  canGoBack: boolean;
  /** Navigation history stack */
  navigationHistory: NavigationState[];
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentState, setCurrentState] = useState<NavigationState>({
    view: 'inbox',
    objectId: null,
  });
  const [history, setHistory] = useState<NavigationState[]>([]);

  const navigateToObject = useCallback((objectId: string) => {
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view: 'object',
      objectId,
    });
  }, [currentState]);

  const navigateToView = useCallback((view: ViewType) => {
    setHistory((prev) => [...prev, currentState]);
    setCurrentState({
      view,
      objectId: null,
    });
  }, [currentState]);

  const navigateBack = useCallback(() => {
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentState(previous);
  }, [history]);

  return (
    <NavigationContext.Provider
      value={{
        currentView: currentState.view,
        selectedObjectId: currentState.objectId,
        navigateToObject,
        navigateToView,
        navigateBack,
        canGoBack: history.length > 0,
        navigationHistory: history,
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
