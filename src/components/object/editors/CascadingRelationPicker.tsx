/**
 * CascadingRelationPicker - RelationPicker with cascading logic for area/project
 *
 * Handles the relationship between area and project properties:
 * - When project is selected/changed: auto-update area from project's area
 * - When area is selected first: filter projects to only show those in that area
 * - Cannot clear area while project is set: must remove project first
 */

import { useMemo, useCallback } from 'react';
import { RelationPicker } from './RelationPicker';
import { useObjects } from '@/contexts';
import type { SkelenoteObject, PropertyValue } from '@/lib/types';
import { BuiltInTypeIds } from '@/lib/types';

interface CascadingRelationPickerProps {
  /** The property being edited: 'area' or 'project' */
  propertyId: 'area' | 'project';
  /** Current value */
  value: string[] | string | null;
  /** The object being edited */
  object: SkelenoteObject;
  /** Callback to update properties (may update multiple properties) */
  onPropertyChange: (propertyId: string, value: PropertyValue) => void;
}

export function CascadingRelationPicker({
  propertyId,
  value,
  object,
  onPropertyChange,
}: CascadingRelationPickerProps) {
  const { store } = useObjects();

  // Get current area and project values from the object
  const currentAreaId = useMemo(() => {
    const areaValue = object.properties.area;
    if (Array.isArray(areaValue) && areaValue.length > 0) {
      return areaValue[0] as string;
    }
    return null;
  }, [object.properties.area]);

  const currentProjectId = useMemo(() => {
    const projectValue = object.properties.project;
    if (Array.isArray(projectValue) && projectValue.length > 0) {
      return projectValue[0] as string;
    }
    return null;
  }, [object.properties.project]);

  // Filter function for projects: only show projects from selected area
  const projectFilterFn = useCallback(
    (obj: SkelenoteObject): boolean => {
      if (!currentAreaId) return true; // No area = show all projects
      const projectAreaValue = obj.properties.area;
      if (Array.isArray(projectAreaValue) && projectAreaValue.length > 0) {
        return projectAreaValue[0] === currentAreaId;
      }
      return false;
    },
    [currentAreaId]
  );

  // Handle area change with validation
  const handleAreaChange = useCallback(
    (newValue: string[] | string | null) => {
      // Normalize to array format
      const newAreaIds = Array.isArray(newValue)
        ? newValue
        : newValue
          ? [newValue]
          : null;

      // This shouldn't happen if UI is correct (disableClear prevents it),
      // but double-check: don't allow clearing area if project is set
      if (
        (newAreaIds === null || newAreaIds.length === 0) &&
        currentProjectId !== null
      ) {
        return;
      }

      onPropertyChange('area', newAreaIds);
    },
    [currentProjectId, onPropertyChange]
  );

  // Handle project change with area auto-population
  const handleProjectChange = useCallback(
    (newValue: string[] | string | null) => {
      // Normalize to array format
      const newProjectIds = Array.isArray(newValue)
        ? newValue
        : newValue
          ? [newValue]
          : null;

      // Update project
      onPropertyChange('project', newProjectIds);

      // If a project was selected, auto-populate area from project's area
      if (newProjectIds && newProjectIds.length > 0 && store) {
        const projectId = newProjectIds[0];
        const project = store.get(projectId);

        if (project) {
          const projectAreaValue = project.properties.area;
          if (Array.isArray(projectAreaValue) && projectAreaValue.length > 0) {
            // Always sync area from project (handles both initial selection and changes)
            onPropertyChange('area', projectAreaValue);
          }
        }
      }
    },
    [store, onPropertyChange]
  );

  if (propertyId === 'area') {
    return (
      <RelationPicker
        id="area"
        value={value}
        targetTypeIds={[BuiltInTypeIds.AREA]}
        multiple={false}
        onChange={handleAreaChange}
        disableClear={currentProjectId !== null}
        disableClearMessage="Remove project first"
      />
    );
  }

  if (propertyId === 'project') {
    return (
      <RelationPicker
        id="project"
        value={value}
        targetTypeIds={[BuiltInTypeIds.PROJECT]}
        multiple={false}
        onChange={handleProjectChange}
        filterFn={currentAreaId ? projectFilterFn : undefined}
      />
    );
  }

  return null;
}
