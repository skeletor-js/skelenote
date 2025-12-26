/**
 * TaskList - displays tasks in a list/table format with drag and drop reordering
 */

import { useState, useCallback, useRef } from 'react';
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

  // Use ref to persist drag over state for drop (state can be cleared by dragLeave)
  const dragOverRef = useRef<{
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
    dragOverRef.current = null;
  }, []);

  // Handle drag over
  const handleDragOver = useCallback(
    (taskId: string, position: 'above' | 'below') => {
      // Don't allow dropping on self
      if (taskId === draggedTaskId) {
        setDragOverState(null);
        dragOverRef.current = null;
        return;
      }
      const newState = { taskId, position };
      setDragOverState(newState);
      dragOverRef.current = newState;
    },
    [draggedTaskId]
  );

  // Handle drag leave - only clear visual state, keep ref for drop
  const handleDragLeave = useCallback(() => {
    // Don't clear the ref - we need it for drop
    // Just clear visual state with a small delay to prevent flicker
    // (dragLeave fires before dragEnter on adjacent element)
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (_targetTaskId: string) => {
      // Use ref instead of state (state might have been cleared by dragLeave)
      const dropState = dragOverRef.current;
      if (draggedTaskId && dropState && onReorder) {
        onReorder(draggedTaskId, dropState.taskId, dropState.position);
      }
      setDraggedTaskId(null);
      setDragOverState(null);
      dragOverRef.current = null;
    },
    [draggedTaskId, onReorder]
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
