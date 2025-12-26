/**
 * TaskCard component for kanban view display
 * Compact card showing title, due date, priority, tags
 */

import { useCallback, useRef } from 'react';
import type { EphemeraObject } from '@/lib/types';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import { useObjects } from '@/contexts';
import { Tag, type TagColor } from '@/components/ui';
import './TaskCard.css';

interface TaskCardProps {
  /** The task object to display */
  task: EphemeraObject;
  /** Callback when card is clicked (navigates to detail) */
  onClick: () => void;
  /** Whether the card is currently being dragged */
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const { store } = useObjects();
  // Track if a drag operation occurred to prevent click after drag
  const wasDragging = useRef(false);

  const isComplete = task.properties.status === 'done';
  const priority = task.properties.priority as string | null;
  const dueDate = task.properties.dueDate as number | null;
  const title = task.properties.title as string;

  // Get tags (limit to 3)
  const tagIds = task.properties.tags as string[] | null;
  const tags = tagIds
    ?.map((id) => store?.get(id))
    .filter((t): t is EphemeraObject => t !== undefined)
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      name: t.properties.name as string,
      color: t.properties.color as TagColor | undefined,
    }));

  // Check if overdue
  const isTaskOverdue = dueDate !== null && !isComplete && isOverdue(dueDate);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      wasDragging.current = true;
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [task.id]
  );

  // Handle drag end - reset drag state
  const handleDragEnd = useCallback(() => {
    // Reset after a short delay to allow click event to check it
    setTimeout(() => {
      wasDragging.current = false;
    }, 0);
  }, []);

  // Handle click - only trigger if not dragging
  const handleClick = useCallback(() => {
    if (!wasDragging.current) {
      onClick();
    }
  }, [onClick]);

  return (
    <div
      className={`task-card ${isComplete ? 'task-card--complete' : ''} ${isDragging ? 'task-card--dragging' : ''}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onClick();
        }
      }}
    >
      {/* Header row: priority + title */}
      <div className="task-card__header">
        {priority && (
          <span
            className={`task-card__priority task-card__priority--${priority}`}
            title={`Priority: ${priority}`}
          />
        )}
        <span className="task-card__title">{title}</span>
      </div>

      {/* Footer row: due date + tags */}
      {(dueDate || (tags && tags.length > 0)) && (
        <div className="task-card__footer">
          {dueDate && (
            <span
              className={`task-card__due-date ${isTaskOverdue ? 'task-card__due-date--overdue' : ''}`}
            >
              {formatRelativeDate(dueDate)}
            </span>
          )}
          {tags && tags.length > 0 && (
            <div className="task-card__tags">
              {tags.map((tag) => (
                <Tag key={tag.id} name={tag.name} color={tag.color} size="sm" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
