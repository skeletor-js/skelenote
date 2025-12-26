/**
 * TaskRow component for list view display
 * Shows: drag handle, checkbox, title, due date, priority, project, tags
 */

import { useCallback, useRef } from 'react';
import type { EphemeraObject } from '@/lib/types';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import { useObjects } from '@/contexts';
import { Tag, type TagColor } from '@/components/ui';
import './TaskRow.css';

// Module-level variable to track dragged task ID
// Using module-level avoids dataTransfer API issues in Tauri webview
let currentDraggedTaskId: string | null = null;

export function getDraggedTaskId(): string | null {
  return currentDraggedTaskId;
}

export function setDraggedTaskId(id: string | null): void {
  currentDraggedTaskId = id;
}

interface TaskRowProps {
  /** The task object to display */
  task: EphemeraObject;
  /** Callback when checkbox is clicked */
  onToggleComplete: (taskId: string) => void;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Whether drag and drop is enabled */
  isDraggable?: boolean;
  /** Current drag state */
  isDragOver?: 'above' | 'below' | null;
  /** Callback when drag starts */
  onDragStart?: (taskId: string) => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
  /** Callback when dragging over this row */
  onDragOver?: (taskId: string, position: 'above' | 'below') => void;
  /** Callback when dragging leaves this row */
  onDragLeave?: () => void;
  /** Callback when dropping on this row */
  onDrop?: (targetTaskId: string, sourceTaskId: string, position: 'above' | 'below') => void;
}

export function TaskRow({
  task,
  onToggleComplete,
  onClick,
  isDraggable = false,
  isDragOver = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: TaskRowProps) {
  const { store } = useObjects();
  const rowRef = useRef<HTMLDivElement>(null);
  const wasDragging = useRef(false);

  const isComplete = task.properties.status === 'done';
  const priority = task.properties.priority as string | null;
  const dueDate = task.properties.dueDate as number | null;
  const title = task.properties.title as string;

  // Get project name
  const projectId = task.properties.project as string | null;
  const project = projectId ? store?.get(projectId) : null;
  const projectName = project?.properties.name as string | undefined;

  // Get tags
  const tagIds = task.properties.tags as string[] | null;
  const tags = tagIds
    ?.map((id) => store?.get(id))
    .filter((t): t is EphemeraObject => t !== undefined)
    .map((t) => ({
      id: t.id,
      name: t.properties.name as string,
      color: t.properties.color as TagColor | undefined,
    }));

  // Check if overdue
  const isTaskOverdue = dueDate !== null && !isComplete && isOverdue(dueDate);

  // Handle checkbox click without triggering row click
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComplete(task.id);
    },
    [onToggleComplete, task.id]
  );

  // Handle keyboard on checkbox
  const handleCheckboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onToggleComplete(task.id);
      }
    },
    [onToggleComplete, task.id]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      wasDragging.current = true;
      // Store in module-level variable (works reliably in Tauri)
      setDraggedTaskId(task.id);
      // Also set in dataTransfer for standard compatibility
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
      onDragStart?.(task.id);
    },
    [task.id, onDragStart]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      wasDragging.current = false;
    }, 0);
    setDraggedTaskId(null);
    onDragEnd?.();
  }, [onDragEnd]);

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Determine if cursor is in top or bottom half
      if (rowRef.current) {
        const rect = rowRef.current.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'above' : 'below';
        onDragOver?.(task.id, position);
      }
    },
    [task.id, onDragOver]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    onDragLeave?.();
  }, [onDragLeave]);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Get source ID from module-level variable (reliable in Tauri)
      const sourceTaskId = getDraggedTaskId();
      if (sourceTaskId && sourceTaskId !== task.id && rowRef.current) {
        // Calculate drop position based on cursor location
        const rect = rowRef.current.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'above' : 'below';
        onDrop?.(task.id, sourceTaskId, position);
      }
      // Clear the dragged ID
      setDraggedTaskId(null);
    },
    [task.id, onDrop]
  );

  // Handle click - prevent if was dragging
  const handleClick = useCallback(() => {
    if (!wasDragging.current) {
      onClick();
    }
  }, [onClick]);

  // Build class names
  const classNames = ['task-row'];
  if (isComplete) classNames.push('task-row--complete');
  if (isDraggable) classNames.push('task-row--draggable');
  if (isDragOver === 'above') classNames.push('task-row--drag-over-above');
  if (isDragOver === 'below') classNames.push('task-row--drag-over-below');

  return (
    <div
      ref={rowRef}
      className={classNames.join(' ')}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDragEnd={isDraggable ? handleDragEnd : undefined}
      onDragOver={isDraggable ? handleDragOver : undefined}
      onDragLeave={isDraggable ? handleDragLeave : undefined}
      onDrop={isDraggable ? handleDrop : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          onClick();
        }
      }}
    >
      {/* Drag handle */}
      {isDraggable && (
        <span className="task-row__drag-handle" aria-hidden="true">
          ⋮⋮
        </span>
      )}

      {/* Checkbox */}
      <button
        className={`task-row__checkbox ${isComplete ? 'task-row__checkbox--checked' : ''}`}
        onClick={handleCheckboxClick}
        onKeyDown={handleCheckboxKeyDown}
        aria-label={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
        aria-pressed={isComplete}
      >
        {isComplete && <span className="task-row__check-icon">✓</span>}
      </button>

      {/* Title */}
      <span className="task-row__title">{title}</span>

      {/* Priority indicator */}
      {priority && (
        <span
          className={`task-row__priority task-row__priority--${priority}`}
          title={`Priority: ${priority}`}
        />
      )}

      {/* Due date */}
      {dueDate && (
        <span
          className={`task-row__due-date ${isTaskOverdue ? 'task-row__due-date--overdue' : ''}`}
        >
          {formatRelativeDate(dueDate)}
        </span>
      )}

      {/* Project chip */}
      {projectName && <span className="task-row__project">{projectName}</span>}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="task-row__tags">
          {tags.slice(0, 2).map((tag) => (
            <Tag key={tag.id} name={tag.name} color={tag.color} size="sm" />
          ))}
          {tags.length > 2 && (
            <span className="task-row__tags-more">+{tags.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
}
