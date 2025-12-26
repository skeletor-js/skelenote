/**
 * TaskKanban - displays tasks in a kanban board format
 */

import { useState, useCallback } from 'react';
import type { EphemeraObject } from '@/lib/types';
import { useNavigation, useObjects } from '@/contexts';
import { getStatusOrder, STATUS_LABELS, groupTasksBy } from '@/lib/tasks/filters';
import { TaskCard } from './TaskCard';
import './TaskKanban.css';

interface TaskKanbanProps {
  /** Tasks to display */
  tasks: EphemeraObject[];
  /** How to group tasks (status or project) */
  groupBy: 'status' | 'project';
  /** Callback when task completion is toggled */
  onToggleComplete: (taskId: string) => void;
  /** Callback when task is moved to a new group */
  onMoveTask: (taskId: string, newValue: string) => void;
  /** Message to show when board is empty */
  emptyMessage?: string;
}

export function TaskKanban({
  tasks,
  groupBy,
  onToggleComplete,
  onMoveTask,
  emptyMessage = 'No tasks',
}: TaskKanbanProps) {
  const { navigateToObject } = useNavigation();
  const { store } = useObjects();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Group tasks
  const groupedTasks = groupTasksBy(tasks, groupBy);

  // Get columns based on groupBy
  const columns =
    groupBy === 'status'
      ? getStatusOrder()
      : [...groupedTasks.keys()].filter((k) => k !== 'none');

  // Add 'none' column for ungrouped tasks when grouping by project
  if (groupBy === 'project' && groupedTasks.has('none')) {
    columns.unshift('none');
  }

  // Get column title
  const getColumnTitle = (columnId: string): string => {
    if (groupBy === 'status') {
      return STATUS_LABELS[columnId] ?? columnId;
    }
    if (columnId === 'none') {
      return 'No Project';
    }
    // Get project name
    const project = store?.get(columnId);
    return (project?.properties.name as string) ?? 'Unknown Project';
  };

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(columnId);
    },
    []
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      setDragOverColumn(null);

      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) {
        onMoveTask(taskId, columnId);
      }
    },
    [onMoveTask]
  );

  if (tasks.length === 0) {
    return (
      <div className="task-kanban task-kanban--empty">
        <p className="task-kanban__empty-message">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="task-kanban">
      {columns.map((columnId) => {
        const columnTasks = groupedTasks.get(columnId) ?? [];
        const isOver = dragOverColumn === columnId;

        return (
          <div
            key={columnId}
            className={`task-kanban__column ${isOver ? 'task-kanban__column--drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, columnId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, columnId)}
          >
            <div className="task-kanban__column-header">
              <span className="task-kanban__column-title">
                {getColumnTitle(columnId)}
              </span>
              <span className="task-kanban__column-count">{columnTasks.length}</span>
            </div>
            <div className="task-kanban__cards">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => navigateToObject(task.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
