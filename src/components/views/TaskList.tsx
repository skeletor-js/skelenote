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

  // Track drag state for visual feedback
  const draggedTaskIdRef = useRef<string | null>(null);
  const [dragOverState, setDragOverState] = useState<{
    taskId: string;
    position: 'above' | 'below';
  } | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((taskId: string) => {
    draggedTaskIdRef.current = taskId;
  }, []);

  // Handle drag end - clear visual state
  const handleDragEnd = useCallback(() => {
    draggedTaskIdRef.current = null;
    setDragOverState(null);
  }, []);

  // Handle drag over - update visual feedback
  const handleDragOver = useCallback(
    (taskId: string, position: 'above' | 'below') => {
      // Don't show feedback when hovering over self
      if (taskId === draggedTaskIdRef.current) {
        setDragOverState(null);
        return;
      }
      setDragOverState({ taskId, position });
    },
    []
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    // Don't clear state here - causes flicker when moving between elements
  }, []);

  // Handle drop - TaskRow now passes all info directly via dataTransfer
  const handleDrop = useCallback(
    (targetTaskId: string, sourceTaskId: string, position: 'above' | 'below') => {
      if (onReorder) {
        onReorder(sourceTaskId, targetTaskId, position);
      }
      // Clear visual state
      draggedTaskIdRef.current = null;
      setDragOverState(null);
    },
    [onReorder]
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
