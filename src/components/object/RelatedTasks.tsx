/**
 * RelatedTasks - Shows tasks that are linked to the current object
 */

import { useMemo, useCallback } from 'react';
import { useObjects, useNavigation } from '@/contexts';
import { BuiltInTypeIds, type PropertyValue } from '@/lib/types';
import { TaskItem } from './TaskItem';
import './RelatedTasks.css';

interface RelatedTasksProps {
  objectId: string;
}

export function RelatedTasks({ objectId }: RelatedTasksProps) {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();

  // Find all tasks that reference this object
  const relatedTasks = useMemo(() => {
    if (!store) return [];

    const allTasks = store.getByType(BuiltInTypeIds.TASK);

    // Filter tasks that have a relation to this objectId
    return allTasks.filter((task) => {
      // Check all properties for relation to this object
      for (const value of Object.values(task.properties)) {
        if (Array.isArray(value) && value.includes(objectId)) {
          return true;
        }
      }
      return false;
    });
  }, [store, objectId]);

  // Sort tasks: incomplete first, then by due date
  const sortedTasks = useMemo(() => {
    return [...relatedTasks].sort((a, b) => {
      const aCompleted =
        a.properties.status === 'done' || a.properties.status === 'cancelled';
      const bCompleted =
        b.properties.status === 'done' || b.properties.status === 'cancelled';

      // Incomplete tasks first
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }

      // Then sort by due date (null dates go to end)
      const aDue = a.properties.dueDate as number | null;
      const bDue = b.properties.dueDate as number | null;

      if (aDue && bDue) {
        return aDue - bDue;
      }
      if (aDue) return -1;
      if (bDue) return 1;

      return 0;
    });
  }, [relatedTasks]);

  // Create a new task linked to this object
  const handleAddTask = useCallback(() => {
    if (!store) return;

    // Determine which property to use based on target object type
    const targetObject = store.get(objectId);
    if (!targetObject) return;

    // Map object type to task relation property
    const relationPropertyMap: Record<string, string> = {
      project: 'project',
      note: 'note',
      tag: 'tags',
      person: 'tags', // Tasks don't have a person relation, use tags as fallback
    };

    const relationProperty = relationPropertyMap[targetObject.typeId];

    // Create the task with the relation
    const taskProperties: Record<string, PropertyValue> = {
      title: 'New Task',
      status: 'todo',
      priority: 'medium',
    };

    // Set the relation based on property type
    if (relationProperty) {
      if (relationProperty === 'tags') {
        // Tags is a multi-relation
        taskProperties[relationProperty] = [objectId];
      } else {
        // Single relation (project, note)
        taskProperties[relationProperty] = [objectId];
      }
    }

    const task = store.create({
      typeId: BuiltInTypeIds.TASK,
      properties: taskProperties,
    });

    refreshData();
    navigateToObject(task.id);
  }, [store, objectId, refreshData, navigateToObject]);

  return (
    <section className="related-tasks">
      <div className="related-tasks__header">
        <h2 className="related-tasks__title">Tasks</h2>
        <button
          type="button"
          className="related-tasks__add"
          onClick={handleAddTask}
        >
          + Add
        </button>
      </div>

      <div className="related-tasks__list">
        {sortedTasks.length === 0 ? (
          <p className="related-tasks__empty">No related tasks</p>
        ) : (
          sortedTasks.map((task) => (
            <TaskItem key={task.id} task={task} onStatusChange={refreshData} />
          ))
        )}
      </div>
    </section>
  );
}
