/**
 * TaskList - displays tasks in a list/table format with drag and drop reordering
 */

import { useState, useCallback } from 'react';
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
  /** Enable drag and drop reordering */
  enableReorder?: boolean;
  /** Callback when tasks are reordered */
  onReorder?: (taskId: string, targetId: string, position: 'above' | 'below') => void;
}

export function TaskList({
  tasks,
  onToggleComplete,
  emptyMessage = 'No tasks',
  enableReorder = false,
  onReorder,
}: TaskListProps) {
  const { navigateToObject } = useNavigation();

  // Track drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<{
    taskId: string;
    position: 'above' | 'below';
  } | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((taskId: string) => {
    setDraggedTaskId(taskId);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverState(null);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback(
    (taskId: string, position: 'above' | 'below') => {
      // Don't allow dropping on self
      if (taskId === draggedTaskId) {
        setDragOverState(null);
        return;
      }
      setDragOverState({ taskId, position });
    },
    [draggedTaskId]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverState(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (targetTaskId: string) => {
      if (draggedTaskId && dragOverState && onReorder) {
        onReorder(draggedTaskId, targetTaskId, dragOverState.position);
      }
      setDraggedTaskId(null);
      setDragOverState(null);
    },
    [draggedTaskId, dragOverState, onReorder]
  );

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
          isDraggable={enableReorder}
          isDragOver={
            dragOverState?.taskId === task.id ? dragOverState.position : null
          }
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
