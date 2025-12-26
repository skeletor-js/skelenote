/**
 * TaskItem - Displays a single task in a list with status toggle
 */

import { useCallback } from 'react';
import { useObjects, useNavigation } from '@/contexts';
import type { EphemeraObject } from '@/lib/types';
import './TaskItem.css';

interface TaskItemProps {
  task: EphemeraObject;
  onStatusChange?: () => void;
}

export function TaskItem({ task, onStatusChange }: TaskItemProps) {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();

  const title = (task.properties.title ?? 'Untitled') as string;
  const status = (task.properties.status ?? 'todo') as string;
  const dueDate = task.properties.dueDate as number | null;
  const priority = (task.properties.priority ?? 'medium') as string;

  const isCompleted = status === 'done' || status === 'cancelled';

  const handleToggleStatus = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!store) return;

      const newStatus = isCompleted ? 'todo' : 'done';
      store.setProperty(task.id, 'status', newStatus);
      refreshData();
      onStatusChange?.();
    },
    [store, task.id, isCompleted, refreshData, onStatusChange]
  );

  const handleClick = useCallback(() => {
    navigateToObject(task.id);
  }, [navigateToObject, task.id]);

  const formatDueDate = (timestamp: number | null): string | null => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if overdue
    if (date < today && !isCompleted) {
      return `Overdue: ${date.toLocaleDateString()}`;
    }

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString();
  };

  const formattedDueDate = formatDueDate(dueDate);
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted;

  return (
    <div
      className={`task-item ${isCompleted ? 'task-item--completed' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <button
        type="button"
        className={`task-item__checkbox ${isCompleted ? 'task-item__checkbox--checked' : ''}`}
        onClick={handleToggleStatus}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted && <span className="task-item__checkmark">✓</span>}
      </button>

      <div className="task-item__content">
        <span className="task-item__title">{title}</span>
        {formattedDueDate && (
          <span
            className={`task-item__due-date ${isOverdue ? 'task-item__due-date--overdue' : ''}`}
          >
            {formattedDueDate}
          </span>
        )}
      </div>

      <span
        className={`task-item__priority task-item__priority--${priority}`}
        title={`Priority: ${priority}`}
      />
    </div>
  );
}
