/**
 * TaskView - main container for task views
 * Displays tasks in a list format
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
  today: 'No tasks due today.',
  'this-week': 'No tasks due this week.',
  overdue: 'Nothing overdue. Nice!',
  blocked: 'No blocked tasks.',
  eventually: 'No future tasks scheduled.',
  completed: 'No completed tasks yet.',
};

export function TaskView({ filter, title }: TaskViewProps) {
  const { tasks, isLoading, toggleComplete, deleteTask } = useTasks({ filter });

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
          onDeleteTask={deleteTask}
          emptyMessage={EMPTY_MESSAGES[filter]}
        />
      </div>
    </div>
  );
}
