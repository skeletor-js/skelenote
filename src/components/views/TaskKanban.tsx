/**
 * TaskKanban - displays tasks in a kanban board format
 */

import { useState, useCallback, useRef } from 'react';
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
  onToggleComplete: _onToggleComplete,
  onMoveTask,
  emptyMessage = 'No tasks',
}: TaskKanbanProps) {
  // Note: onToggleComplete is available but not used in kanban view
  // Cards navigate to detail view on click instead
  void _onToggleComplete;
  const { navigateToObject } = useNavigation();
  const { store } = useObjects();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Track drag enter count per column to handle nested elements
  const dragCounters = useRef<Map<string, number>>(new Map());

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

  // Handle drag enter - use counter to track nested elements
  const handleDragEnter = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      const count = (dragCounters.current.get(columnId) ?? 0) + 1;
      dragCounters.current.set(columnId, count);
      if (count === 1) {
        setDragOverColumn(columnId);
      }
    },
    []
  );

  // Handle drag over - required for drop to work
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drag leave - use counter to handle nested elements
  const handleDragLeave = useCallback((columnId: string) => {
    const count = (dragCounters.current.get(columnId) ?? 1) - 1;
    dragCounters.current.set(columnId, count);
    if (count === 0) {
      setDragOverColumn(null);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      dragCounters.current.set(columnId, 0);
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
            onDragEnter={(e) => handleDragEnter(e, columnId)}
            onDragOver={handleDragOver}
            onDragLeave={() => handleDragLeave(columnId)}
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
