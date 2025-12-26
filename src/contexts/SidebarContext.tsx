import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

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
  const [isCollapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>('inbox');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

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
