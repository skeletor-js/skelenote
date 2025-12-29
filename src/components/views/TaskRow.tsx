/**
 * TaskRow component for list view display
 * Shows: checkbox, title, due date, priority, project, tags
 */

import { useCallback } from 'react';
import type { SkelenoteObject } from '@/lib/types';
import { formatRelativeDate, isOverdue } from '@/lib/utils/date';
import { useObjects, useToast } from '@/contexts';
import { Tag, ContextMenu, ConfirmDialog, type TagColor, type ContextMenuItem } from '@/components/ui';
import { useContextMenu, useConfirmDialog, usePinnedObjects } from '@/hooks';
import './TaskRow.css';

interface TaskRowProps {
  /** The task object to display */
  task: SkelenoteObject;
  /** Callback when checkbox is clicked */
  onToggleComplete: (taskId: string) => void;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback when task is deleted */
  onDelete: (taskId: string) => void;
}

export function TaskRow({
  task,
  onToggleComplete,
  onClick,
  onDelete,
}: TaskRowProps) {
  const { store } = useObjects();
  const { addToast } = useToast();
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmDialog();
  const { isOpen, position, openContextMenu, closeContextMenu } = useContextMenu();
  const { isPinned, pin, unpin } = usePinnedObjects();

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
    .filter((t): t is SkelenoteObject => t !== undefined)
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

  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Delete Task?',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      onDelete(task.id);
      addToast({
        type: 'success',
        message: `"${title}" deleted`,
      });
    }
  }, [confirm, title, task.id, onDelete, addToast]);

  // Handle pin/unpin
  const taskIsPinned = isPinned(task.id);
  const handleTogglePin = useCallback(() => {
    if (taskIsPinned) {
      unpin(task.id);
      addToast({ type: 'success', message: 'Removed from pins' });
    } else {
      pin(task.id);
      addToast({ type: 'success', message: 'Pinned to sidebar' });
    }
  }, [taskIsPinned, pin, unpin, task.id, addToast]);

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'pin',
      label: taskIsPinned ? 'Unpin from Sidebar' : 'Pin to Sidebar',
      icon: '📌',
      onClick: handleTogglePin,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      variant: 'danger',
      onClick: handleDelete,
    },
  ];

  // Build class names
  const classNames = ['task-row'];
  if (isComplete) classNames.push('task-row--complete');

  return (
    <>
    <div
      className={classNames.join(' ')}
      onClick={onClick}
      onContextMenu={openContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          onClick();
        }
      }}
    >
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

    {/* Context Menu */}
    <ContextMenu
      items={contextMenuItems}
      position={position}
      isOpen={isOpen}
      onClose={closeContextMenu}
    />

    {/* Confirm Dialog */}
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      title={dialogState.title}
      message={dialogState.message}
      confirmLabel={dialogState.confirmLabel}
      cancelLabel={dialogState.cancelLabel}
      variant={dialogState.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
    </>
  );
}
