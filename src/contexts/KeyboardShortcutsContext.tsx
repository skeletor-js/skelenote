import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

/**
 * Definition for a keyboard shortcut
 */
export interface ShortcutDefinition {
  /** The key to listen for (e.g., 'k', '\\', 'Escape') */
  key: string;
  /** Require Meta (Cmd on Mac, Win on Windows) key */
  metaKey?: boolean;
  /** Require Ctrl key */
  ctrlKey?: boolean;
  /** Require Shift key */
  shiftKey?: boolean;
  /** Require Alt key */
  altKey?: boolean;
  /**
   * Callback to execute when shortcut is triggered.
   * Return false to indicate the event was not handled (allows default behavior).
   * Return void/undefined/true to prevent default behavior.
   * Can be async.
   */
  action: () => void | boolean | Promise<void> | Promise<boolean>;
  /** Human-readable description of the shortcut */
  description: string;
  /** Whether the shortcut is currently enabled (default: true) */
  enabled?: boolean;
}

interface KeyboardShortcutsContextValue {
  /** Register a keyboard shortcut */
  registerShortcut: (id: string, shortcut: ShortcutDefinition) => void;
  /** Unregister a keyboard shortcut */
  unregisterShortcut: (id: string) => void;
  /** Get all registered shortcuts (for help display) */
  getShortcuts: () => Map<string, ShortcutDefinition>;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  // Use ref to store shortcuts to avoid re-renders when shortcuts change
  const shortcutsRef = useRef<Map<string, ShortcutDefinition>>(new Map());

  const registerShortcut = useCallback((id: string, shortcut: ShortcutDefinition) => {
    shortcutsRef.current.set(id, { enabled: true, ...shortcut });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    shortcutsRef.current.delete(id);
  }, []);

  const getShortcuts = useCallback(() => {
    return new Map(shortcutsRef.current);
  }, []);

  // Global keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const [, shortcut] of shortcutsRef.current) {
        // Skip disabled shortcuts
        if (shortcut.enabled === false) continue;

        // Check if key matches (case-insensitive)
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatches) continue;

        // Check modifier keys
        const metaMatches = shortcut.metaKey ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatches = shortcut.ctrlKey ? e.ctrlKey : true;
        const shiftMatches = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const altMatches = shortcut.altKey ? e.altKey : !e.altKey;

        // For shortcuts without modifiers, skip if in input field
        // (allows Escape to work in inputs for example)
        const hasModifiers = shortcut.metaKey || shortcut.ctrlKey || shortcut.altKey;
        if (!hasModifiers && isInputField && shortcut.key !== 'Escape') {
          continue;
        }

        if (keyMatches && metaMatches && ctrlMatches && shiftMatches && altMatches) {
          // Execute the action and check return value
          // If action returns false, it indicates the event was not handled
          // and should propagate (allows BlockNote undo/redo when editor focused)
          const result = shortcut.action();

          // For sync actions, check immediately; for async, prevent default by default
          // (async actions that want to allow default should be sync and return false)
          if (result !== false && !(result instanceof Promise)) {
            e.preventDefault();
          }
          return; // Only trigger one shortcut per key event
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        registerShortcut,
        unregisterShortcut,
        getShortcuts,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

/**
 * Safe version that returns null if outside provider
 */
export function useKeyboardShortcutsSafe(): KeyboardShortcutsContextValue | null {
  return useContext(KeyboardShortcutsContext);
}
