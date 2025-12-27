/**
 * TaskList - displays tasks in a list format
 */

import type { SkelenoteObject } from '@/lib/types';
import { useNavigation } from '@/contexts';
import { EmptyState } from '@/components/ui';
import { TaskRow } from './TaskRow';
import './TaskList.css';

interface TaskListProps {
  /** Tasks to display */
  tasks: SkelenoteObject[];
  /** Callback when task completion is toggled */
  onToggleComplete: (taskId: string) => void;
  /** Callback when task is deleted */
  onDeleteTask: (taskId: string) => void;
  /** Message to show when list is empty */
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  onToggleComplete,
  onDeleteTask,
  emptyMessage = 'No tasks',
}: TaskListProps) {
  const { navigateToObject } = useNavigation();

  if (tasks.length === 0) {
    return <EmptyState message={emptyMessage} size="large" />;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onDelete={onDeleteTask}
          onClick={() => navigateToObject(task.id)}
        />
      ))}
    </div>
  );
}
