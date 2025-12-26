/**
 * TaskList - displays tasks in a list/table format
 */

import type { EphemeraObject } from '@/lib/types';
import { useNavigation } from '@/contexts';
import { TaskRow } from './TaskRow';
import './TaskList.css';

interface TaskListProps {
  /** Tasks to display */
  tasks: EphemeraObject[];
  /** Callback when task completion is toggled */
  onToggleComplete: (taskId: string) => void;
  /** Message to show when list is empty */
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  onToggleComplete,
  emptyMessage = 'No tasks',
}: TaskListProps) {
  const { navigateToObject } = useNavigation();

  if (tasks.length === 0) {
    return (
      <div className="task-list task-list--empty">
        <p className="task-list__empty-message">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onClick={() => navigateToObject(task.id)}
        />
      ))}
    </div>
  );
}
