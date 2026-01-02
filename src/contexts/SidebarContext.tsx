import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

const STORAGE_KEY_COLLAPSED_SECTIONS = 'skelenote-sidebar-collapsed-sections';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'skelenote-sidebar-collapsed';

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

function loadSidebarCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return false;
}

interface SidebarContextValue {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  collapsedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  isSectionCollapsed: (sectionId: string) => boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setCollapsed] = useState(loadSidebarCollapsed);
  const [selectedItem, setSelectedItem] = useState<string | null>('inbox');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    loadCollapsedSections
  );

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Persist section collapsed states
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_COLLAPSED_SECTIONS,
      JSON.stringify([...collapsedSections])
    );
  }, [collapsedSections]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

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
        isCollapsed,
        setCollapsed,
        toggleCollapsed,
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

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
