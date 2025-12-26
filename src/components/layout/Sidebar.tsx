import { useMemo } from 'react';
import './Sidebar.css';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { Tag, type TagColor } from '@/components/ui';
import { useSidebar, useNavigation, useObjects, type ViewType } from '@/contexts';
import { useTheme } from '@/hooks';
import { BuiltInTypeIds } from '@/lib/types';

interface SidebarProps {
  inboxCount?: number;
}

export function Sidebar({ inboxCount = 0 }: SidebarProps) {
  const { isCollapsed, toggleCollapsed, selectedItem, setSelectedItem } = useSidebar();
  const { navigateToView, navigateToObject } = useNavigation();
  const { store } = useObjects();
  const { theme, toggleTheme } = useTheme();

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
        {/* Primary navigation */}
        <div className="sidebar__primary">
          <SidebarItem
            id="inbox"
            icon="📥"
            label="Inbox"
            count={inboxCount}
            onClick={() => handleNavigate('inbox')}
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

      {/* Footer with controls */}
      <div className="sidebar__footer">
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
    </aside>
  );
}
