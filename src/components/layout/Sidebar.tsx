import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import './Sidebar.css';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { PinnedSection } from './PinnedSection';
import { SavedViewsSection } from './SavedViewsSection';
import { Tag, type TagColor, SyncIndicator } from '@/components/ui';
import { useSidebar, useNavigation, useObjects, useTypeRegistry, type ViewType } from '@/contexts';
import { useTheme, useLinkToDaily } from '@/hooks';
import { BuiltInTypeIds, type PropertyValue, type SavedView } from '@/lib/types';

// Default properties for each type when creating
const defaultPropertiesForType: Record<string, Record<string, PropertyValue>> = {
  [BuiltInTypeIds.TASK]: { title: 'New Task', status: 'todo', priority: 'medium' },
  [BuiltInTypeIds.NOTE]: { title: 'New Note' },
  [BuiltInTypeIds.PROJECT]: { name: 'New Project', status: 'active' },
  [BuiltInTypeIds.LINK]: { url: 'https://', title: 'New Link' },
  [BuiltInTypeIds.MEETING]: { title: 'New Meeting', startTime: Date.now() },
  [BuiltInTypeIds.TAG]: { name: 'new-tag' },
  [BuiltInTypeIds.PERSON]: { name: 'New Person' },
};

interface SidebarProps {
  inboxCount?: number;
}

export function Sidebar({ inboxCount = 0 }: SidebarProps) {
  const { isCollapsed, toggleCollapsed, selectedItem, setSelectedItem } = useSidebar();
  const { navigateToView, navigateToObject, navigateToSavedView, activeSavedViewId } = useNavigation();
  const { store, refreshData } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { theme, toggleTheme } = useTheme();
  const { linkToDaily } = useLinkToDaily();

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const typeSelectorRef = useRef<HTMLDivElement>(null);

  // Handle saved view selection
  const handleSavedViewSelect = useCallback(
    (view: SavedView) => {
      navigateToSavedView(view.id);
    },
    [navigateToSavedView]
  );

  // Get all available types for the selector
  const availableTypes = useMemo(() => {
    return typeRegistry.getAll().map((typeDef) => ({
      id: typeDef.id,
      name: typeDef.name,
      icon: typeDef.icon,
    }));
  }, [typeRegistry]);

  // Handle creating a new object of the selected type
  const handleCreateObject = useCallback(
    (typeId: string) => {
      if (!store) return;

      const defaultProps = defaultPropertiesForType[typeId] || {};
      const newObject = store.create({
        typeId,
        properties: defaultProps,
      });

      // Link to today's daily note
      linkToDaily(newObject);

      refreshData();
      setShowTypeSelector(false);
      navigateToObject(newObject.id);
    },
    [store, linkToDaily, refreshData, navigateToObject]
  );

  // Close type selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeSelectorRef.current && !typeSelectorRef.current.contains(event.target as Node)) {
        setShowTypeSelector(false);
      }
    };

    if (showTypeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypeSelector]);

  // Get real projects from the store
  const projects = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.PROJECT).map((obj) => ({
      id: obj.id,
      name: (obj.properties.name as string) || 'Untitled Project',
    }));
  }, [store]);

  // Get real tags from the store
  const tags = useMemo(() => {
    if (!store) return [];
    return store.getByType(BuiltInTypeIds.TAG).map((obj) => ({
      id: obj.id,
      name: (obj.properties.name as string) || 'Untitled',
      color: (obj.properties.color as TagColor) || undefined,
    }));
  }, [store]);

  const handleNavigate = (view: ViewType) => {
    navigateToView(view);
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__content">
        {/* Pinned section */}
        <PinnedSection />

        {/* Saved views section */}
        <SavedViewsSection
          onViewSelect={handleSavedViewSelect}
          activeViewId={activeSavedViewId}
        />

        {/* Primary navigation */}
        <div className="sidebar__primary">
          <SidebarItem
            id="inbox"
            icon="📥"
            label="Inbox"
            count={inboxCount}
            onClick={() => handleNavigate('inbox')}
          />
          <SidebarItem
            id="search"
            icon="🔎"
            label="Search"
            onClick={() => handleNavigate('search')}
          />
          <SidebarItem
            id="time-machine"
            icon="🕰️"
            label="Time Machine"
            onClick={() => handleNavigate('time-machine')}
          />
        </div>

        <div className="sidebar__divider" />

        {/* Quick access */}
        <div className="sidebar__quick">
          <SidebarItem
            id="today"
            icon="📅"
            label="Today"
            onClick={() => handleNavigate('today')}
          />
          <SidebarItem
            id="daily-notes"
            icon="📆"
            label="Daily Notes"
            onClick={() => handleNavigate('daily-notes')}
          />
        </div>

        <div className="sidebar__divider" />

        {/* Tasks section */}
        <SidebarSection id="tasks" title="Tasks">
          <SidebarItem
            id="this-week"
            label="This Week"
            indent
            onClick={() => handleNavigate('this-week')}
          />
          <SidebarItem
            id="overdue"
            label="Overdue"
            indent
            onClick={() => handleNavigate('overdue')}
          />
          <SidebarItem
            id="blocked"
            label="Blocked"
            indent
            onClick={() => handleNavigate('blocked')}
          />
          <SidebarItem
            id="eventually"
            label="Eventually"
            indent
            onClick={() => handleNavigate('eventually')}
          />
          <SidebarItem
            id="completed"
            label="Completed"
            indent
            onClick={() => handleNavigate('completed')}
          />
        </SidebarSection>

        {/* Projects section */}
        <SidebarSection id="projects" title="Projects">
          {projects.length === 0 ? (
            <div className="sidebar__empty-text">No projects yet</div>
          ) : (
            projects.map((project) => (
              <SidebarItem
                key={project.id}
                id={`project-${project.id}`}
                label={project.name}
                indent
                onClick={() => navigateToObject(project.id)}
              />
            ))
          )}
        </SidebarSection>

        {/* Tags section */}
        <SidebarSection id="tags" title="Tags">
          {tags.length === 0 ? (
            <div className="sidebar__empty-text">No tags yet</div>
          ) : (
            tags.map((tag) => {
              const tagItemId = `tag-${tag.id}`;
              const isSelected = selectedItem === tagItemId;
              return (
                <button
                  key={tag.id}
                  className={`sidebar__tag-item ${isSelected ? 'sidebar__tag-item--selected' : ''}`}
                  onClick={() => {
                    setSelectedItem(tagItemId);
                    navigateToObject(tag.id);
                  }}
                >
                  <Tag name={tag.name} color={tag.color} size="sm" />
                </button>
              );
            })
          )}
        </SidebarSection>
      </div>

      {/* Add Object button */}
      <div className="sidebar__add-object" ref={typeSelectorRef}>
        <button
          className="sidebar__add-btn"
          onClick={() => setShowTypeSelector(!showTypeSelector)}
          aria-expanded={showTypeSelector}
        >
          + Add Object
        </button>

        {showTypeSelector && (
          <div className="sidebar__type-selector">
            {availableTypes.map((type) => (
              <button
                key={type.id}
                className="sidebar__type-option"
                onClick={() => handleCreateObject(type.id)}
              >
                <span className="sidebar__type-icon">{type.icon}</span>
                <span className="sidebar__type-name">{type.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with controls */}
      <div className="sidebar__footer">
        <SyncIndicator />

        <div className="sidebar__controls">
          <button
            className="sidebar__control-btn"
            onClick={() => handleNavigate('settings')}
            aria-label="Settings"
          >
            ⚙
          </button>
          <button
            className="sidebar__control-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            className="sidebar__control-btn"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
          >
            ◀
          </button>
        </div>
      </div>
    </aside>
  );
}
