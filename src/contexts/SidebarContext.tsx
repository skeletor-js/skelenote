import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

const STORAGE_KEY_COLLAPSED_SECTIONS = 'skelenote-sidebar-collapsed-sections';

function loadCollapsedSections(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLLAPSED_SECTIONS);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

interface SidebarContextValue {
  /** Currently selected item in the sidebar */
  selectedItem: string | null;
  /** Set the selected item */
  setSelectedItem: (item: string | null) => void;
  /** Set of collapsed section IDs */
  collapsedSections: Set<string>;
  /** Toggle a section's collapsed state */
  toggleSection: (sectionId: string) => void;
  /** Check if a section is collapsed */
  isSectionCollapsed: (sectionId: string) => boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>('inbox');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    loadCollapsedSections
  );

  // Persist section collapsed states
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_COLLAPSED_SECTIONS,
      JSON.stringify([...collapsedSections])
    );
  }, [collapsedSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSectionCollapsed = useCallback(
    (sectionId: string) => collapsedSections.has(sectionId),
    [collapsedSections]
  );

  return (
    <SidebarContext.Provider
      value={{
        selectedItem,
        setSelectedItem,
        collapsedSections,
        toggleSection,
        isSectionCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
