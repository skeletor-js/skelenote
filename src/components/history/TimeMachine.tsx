/**
 * TimeMachine - Main container for Time Machine feature
 *
 * Provides calendar and timeline navigation to browse version history,
 * view historical object snapshots, and restore previous states.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useObjects, useNavigation, useToast, useTypeRegistry } from '@/contexts';
import { CalendarView } from './CalendarView';
import { TimelineSlider } from './TimelineSlider';
import { SnapshotPreview } from './SnapshotPreview';
import { ObjectPreview } from './ObjectPreview';
import { RestoreDialog, type RestoreScope } from './RestoreDialog';
import type { DayChanges, ChangePoint, ObjectVersionHistory } from '@/lib/loro/versions';
import type { SkelenoteObject } from '@/lib/types';
import './TimeMachine.css';

interface RestoreDialogState {
  isOpen: boolean;
  scope: RestoreScope;
  objectTitle?: string;
}

export function TimeMachine() {
  const { docStore, refreshData } = useObjects();
  const { navigateBack, navigateToObject, navigateToTimeMachine, timeMachineObjectFilter } = useNavigation();
  const { addToast } = useToast();
  const typeRegistry = useTypeRegistry();
  const { openVersionComparison } = useNavigation();

  // State
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChangeIndex, setSelectedChangeIndex] = useState(0);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Restore dialog state
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialogState>({
    isOpen: false,
    scope: 'single',
  });

  // Load version history (filtered or full)
  const { byDate, objectTitle, isFiltered } = useMemo(() => {
    if (timeMachineObjectFilter) {
      const history = docStore.getVersionHistoryForObject(timeMachineObjectFilter) as ObjectVersionHistory;
      return {
        byDate: history.byDate,
        objectTitle: history.objectTitle,
        isFiltered: true,
      };
    } else {
      const history = docStore.getVersionHistory();
      return {
        byDate: history.byDate,
        objectTitle: null,
        isFiltered: false,
      };
    }
  }, [docStore, timeMachineObjectFilter]);

  // Get the type icon for the filtered object
  const filteredObjectIcon = useMemo(() => {
    if (!timeMachineObjectFilter || !isFiltered) return null;

    // Try to get the object's type to show its icon
    const objectsAtCurrent = docStore.getObjectsAtVersion(
      docStore.getVersionHistory().changePoints.slice(-1)[0]?.frontier || []
    );
    const obj = objectsAtCurrent.find((o) => o.id === timeMachineObjectFilter);
    if (obj) {
      const typeDef = typeRegistry.get(obj.typeId);
      return typeDef?.icon || null;
    }
    return null;
  }, [docStore, timeMachineObjectFilter, isFiltered, typeRegistry]);

  // Get changes for selected date
  const selectedDayChanges = useMemo((): DayChanges | null => {
    if (!selectedDate) return null;
    return byDate.get(selectedDate) ?? null;
  }, [selectedDate, byDate]);

  // Get the selected change point
  const selectedChangePoint = useMemo((): ChangePoint | null => {
    if (!selectedDayChanges) return null;
    return selectedDayChanges.changePoints[selectedChangeIndex] ?? null;
  }, [selectedDayChanges, selectedChangeIndex]);

  // Get objects at the selected frontier
  // In filtered mode, use the cumulative frontier to get the correct document state
  const historicalObjects = useMemo((): SkelenoteObject[] => {
    if (!selectedChangePoint) return [];

    // Get the full version history to build the cumulative frontier
    const fullHistory = docStore.getVersionHistory();
    const allChangePoints = fullHistory.changePoints;

    // Find the cumulative frontier at this change point's timestamp
    // This combines all peers' changes up to this point
    const relevantChanges = allChangePoints.filter(
      (cp) => cp.timestamp <= selectedChangePoint.timestamp
    );

    if (relevantChanges.length === 0) return [];

    // Build cumulative frontier
    const peerMaxCounters = new Map<string, number>();
    for (const cp of relevantChanges) {
      const frontierOp = cp.frontier[0];
      if (!frontierOp) continue;
      const current = peerMaxCounters.get(cp.peerId) ?? -1;
      if (frontierOp.counter > current) {
        peerMaxCounters.set(cp.peerId, frontierOp.counter);
      }
    }

    const cumulativeFrontier: Array<{ peer: string; counter: number }> = [];
    for (const [peer, counter] of peerMaxCounters) {
      cumulativeFrontier.push({ peer, counter });
    }

    if (cumulativeFrontier.length === 0) return [];

    // Get all objects at this cumulative frontier
    const allObjects = docStore.getObjectsAtVersion(cumulativeFrontier as any) as SkelenoteObject[];

    // In filtered mode, only return the filtered object
    if (isFiltered && timeMachineObjectFilter) {
      const filteredObj = allObjects.find((obj) => obj.id === timeMachineObjectFilter);
      return filteredObj ? [filteredObj] : [];
    }

    return allObjects;
  }, [docStore, selectedChangePoint, isFiltered, timeMachineObjectFilter]);

  // Get the selected object for detail view
  const selectedObject = useMemo((): SkelenoteObject | null => {
    if (!selectedObjectId) return null;
    return historicalObjects.find((obj) => obj.id === selectedObjectId) ?? null;
  }, [selectedObjectId, historicalObjects]);

  // Handlers
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedChangeIndex(0);
    setSelectedObjectId(null);
  }, []);

  const handleChangeIndexChange = useCallback((index: number) => {
    setSelectedChangeIndex(index);
    setSelectedObjectId(null);
  }, []);

  const handleObjectSelect = useCallback((objectId: string) => {
    setSelectedObjectId(objectId);
  }, []);

  const handleObjectClose = useCallback(() => {
    setSelectedObjectId(null);
  }, []);

  // Open restore dialog for full restore
  const handleRestoreFull = useCallback(() => {
    if (!selectedChangePoint) return;
    setRestoreDialog({
      isOpen: true,
      scope: 'full',
    });
  }, [selectedChangePoint]);

  // Open restore dialog for single object restore
  const handleRestoreObject = useCallback(() => {
    if (!selectedChangePoint || !selectedObjectId) return;

    const obj = historicalObjects.find((o) => o.id === selectedObjectId);
    const title =
      (obj?.properties?.title as string) ||
      (obj?.properties?.name as string) ||
      'this object';

    setRestoreDialog({
      isOpen: true,
      scope: 'single',
      objectTitle: title,
    });
  }, [selectedChangePoint, selectedObjectId, historicalObjects]);

  // Actually perform the restore
  const handleRestoreConfirm = useCallback(() => {
    if (!selectedChangePoint) return;

    const { scope } = restoreDialog;
    let success = false;

    if (scope === 'full') {
      success = docStore.restoreFromVersion(selectedChangePoint.frontier, {
        type: 'full',
      });
    } else if (selectedObjectId) {
      success = docStore.restoreFromVersion(selectedChangePoint.frontier, {
        type: 'single',
        objectId: selectedObjectId,
      });
    }

    setRestoreDialog({ isOpen: false, scope: 'single' });

    if (success) {
      refreshData();
      addToast({
        type: 'success',
        message: scope === 'full' ? 'All objects restored successfully!' : 'Object restored successfully!',
      });
    } else {
      addToast({
        type: 'error',
        message: 'Failed to restore. Check the console for details.',
      });
    }
  }, [selectedChangePoint, selectedObjectId, restoreDialog, docStore, refreshData, addToast]);

  // Cancel the restore dialog
  const handleRestoreCancel = useCallback(() => {
    setRestoreDialog({ isOpen: false, scope: 'single' });
  }, []);

  // Navigate back to the filtered object
  const handleBackToObject = useCallback(() => {
    if (timeMachineObjectFilter) {
      navigateToObject(timeMachineObjectFilter);
    }
  }, [timeMachineObjectFilter, navigateToObject]);

  // Clear filter to view all history
  const handleViewAllHistory = useCallback(() => {
    navigateToTimeMachine(); // Navigate without filter
  }, [navigateToTimeMachine]);

  const handleCompareWithCurrent = useCallback(
    (objectId: string) => {
      if (!selectedChangePoint) return;
      // Open version comparison: current on left, historical on right
      openVersionComparison(
        objectId,
        selectedChangePoint.frontier,
        selectedChangePoint.timestamp
      );
    },
    [openVersionComparison, selectedChangePoint]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedObjectId) {
          // First, clear object selection
          setSelectedObjectId(null);
        } else if (isFiltered) {
          // If in filtered mode, go back to the object
          handleBackToObject();
        } else {
          // Otherwise, exit Time Machine
          navigateBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateBack, selectedObjectId, isFiltered, handleBackToObject]);

  return (
    <div className="time-machine">
      <header className="time-machine__header">
        {isFiltered ? (
          <>
            <button className="time-machine__back" onClick={handleBackToObject}>
              ← Back
            </button>
            <div className="time-machine__filter-info">
              <span className="time-machine__filter-label">History:</span>
              {filteredObjectIcon && (
                <span className="time-machine__filter-icon" aria-hidden="true">
                  {filteredObjectIcon}
                </span>
              )}
              <span className="time-machine__filter-title">{objectTitle}</span>
            </div>
            <button
              className="time-machine__view-all"
              onClick={handleViewAllHistory}
            >
              View All History
            </button>
          </>
        ) : (
          <>
            <button className="time-machine__back" onClick={navigateBack}>
              ← Back to Notes
            </button>
            <h1 className="time-machine__title">Time Machine</h1>
          </>
        )}
      </header>

      <div className="time-machine__content">
        {/* Left column: Calendar + Timeline */}
        <div className="time-machine__nav">
          <CalendarView
            currentMonth={currentMonth}
            changesByDate={byDate}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onMonthChange={setCurrentMonth}
          />

          {selectedDayChanges && (
            <TimelineSlider
              date={selectedDate!}
              changePoints={selectedDayChanges.changePoints}
              selectedIndex={selectedChangeIndex}
              onIndexChange={handleChangeIndexChange}
            />
          )}
        </div>

        {/* Right column: Preview */}
        <div className="time-machine__preview">
          {selectedChangePoint ? (
            selectedObject ? (
              <ObjectPreview
                object={selectedObject}
                frontier={selectedChangePoint.frontier}
                timestamp={selectedChangePoint.timestamp}
                onRestore={handleRestoreObject}
                onCompareWithCurrent={() => handleCompareWithCurrent(selectedObject.id)}
                onClose={handleObjectClose}
              />
            ) : (
              <SnapshotPreview
                timestamp={selectedChangePoint.timestamp}
                frontier={selectedChangePoint.frontier}
                objects={historicalObjects}
                onObjectSelect={handleObjectSelect}
                onRestore={handleRestoreFull}
                onCompareWithCurrent={handleCompareWithCurrent}
              />
            )
          ) : isFiltered && byDate.size === 0 ? (
            <div className="time-machine__empty time-machine__empty--filtered">
              <p className="time-machine__empty-title">No recorded history for this object</p>
              <p className="time-machine__empty-message">
                Changes made before history tracking was enabled are not available in Time Machine.
              </p>
              <button
                className="time-machine__view-all time-machine__view-all--prominent"
                onClick={handleViewAllHistory}
              >
                View All History
              </button>
            </div>
          ) : (
            <div className="time-machine__empty">
              <p>Select a date with changes to view historical state</p>
            </div>
          )}
        </div>
      </div>

      {/* Restore Dialog */}
      <RestoreDialog
        isOpen={restoreDialog.isOpen}
        scope={restoreDialog.scope}
        timestamp={selectedChangePoint?.timestamp ?? 0}
        objectTitle={restoreDialog.objectTitle}
        objectCount={historicalObjects.length}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />
    </div>
  );
}
