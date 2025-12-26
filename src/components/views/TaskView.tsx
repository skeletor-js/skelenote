/**
 * TaskView - main container for task views
 * Combines header, view mode toggle, and list/kanban display
 */

import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import type { TaskFilter } from '@/lib/tasks/filters';
import { TaskList } from './TaskList';
import { TaskKanban } from './TaskKanban';
import { ViewModeToggle, type ViewMode } from './ViewModeToggle';
import './TaskView.css';

interface TaskViewProps {
  /** Which filter to apply */
  filter: TaskFilter;
  /** View title to display */
  title: string;
}

/** Empty state messages for each filter */
const EMPTY_MESSAGES: Record<TaskFilter, string> = {
  today: 'No tasks due today',
  'this-week': 'No tasks due this week',
  overdue: 'No overdue tasks',
  blocked: 'No blocked tasks',
  eventually: 'No future tasks',
  completed: 'No completed tasks yet',
};

export function TaskView({ filter, title }: TaskViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'project'>('status');

  const { tasks, isLoading, toggleComplete, updateStatus } = useTasks({
    filter,
    groupBy: viewMode === 'kanban' ? groupBy : undefined,
  });

  if (isLoading) {
    return (
      <div className="task-view task-view--loading">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="task-view">
      {/* Header */}
      <header className="task-view__header">
        <h1 className="task-view__title">{title}</h1>
        <div className="task-view__controls">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          {viewMode === 'kanban' && (
            <select
              className="task-view__group-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'status' | 'project')}
              aria-label="Group by"
            >
              <option value="status">Group by Status</option>
              <option value="project">Group by Project</option>
            </select>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="task-view__content" id="task-view-content" role="tabpanel">
        {viewMode === 'list' ? (
          <TaskList
            tasks={tasks}
            onToggleComplete={toggleComplete}
            emptyMessage={EMPTY_MESSAGES[filter]}
          />
        ) : (
          <TaskKanban
            tasks={tasks}
            groupBy={groupBy}
            onToggleComplete={toggleComplete}
            onMoveTask={(taskId, newValue) => {
              if (groupBy === 'status') {
                updateStatus(taskId, newValue);
              }
              // Project grouping would need different handling
            }}
            emptyMessage={EMPTY_MESSAGES[filter]}
          />
        )}
      </div>
    </div>
  );
}
