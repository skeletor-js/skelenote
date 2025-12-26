/**
 * TaskView - main container for task views
 * Displays tasks in a list format with drag and drop reordering
 */

import { useTasks } from '@/hooks/useTasks';
import type { TaskFilter } from '@/lib/tasks/filters';
import { TaskList } from './TaskList';
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
  const { tasks, isLoading, toggleComplete, reorderTask } = useTasks({
    filter,
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
      </header>

      {/* Content */}
      <div className="task-view__content">
        <TaskList
          tasks={tasks}
          onToggleComplete={toggleComplete}
          emptyMessage={EMPTY_MESSAGES[filter]}
          enableReorder
          onReorder={reorderTask}
        />
      </div>
    </div>
  );
}
