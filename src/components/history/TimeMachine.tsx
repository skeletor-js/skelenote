/**
 * TimeMachine - Main container for Time Machine feature
 *
 * Provides calendar and timeline navigation to browse version history,
 * view historical object snapshots, and restore previous states.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useObjects, useNavigation, useToast } from '@/contexts';
import { CalendarView } from './CalendarView';
import { TimelineSlider } from './TimelineSlider';
import { SnapshotPreview } from './SnapshotPreview';
import { ObjectPreview } from './ObjectPreview';
import { RestoreDialog, type RestoreScope } from './RestoreDialog';
import type { DayChanges, ChangePoint } from '@/lib/loro/versions';
import type { SkelenoteObject } from '@/lib/types';
import './TimeMachine.css';

interface RestoreDialogState {
  isOpen: boolean;
  scope: RestoreScope;
  objectTitle?: string;
}

export function TimeMachine() {
  const { docStore, refreshData } = useObjects();
  const { navigateBack, openVersionComparison } = useNavigation();
  const { addToast } = useToast();

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

  // Load version history
  const { byDate } = useMemo(() => {
    const history = docStore.getVersionHistory();
    return { byDate: history.byDate };
  }, [docStore]);

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
  const historicalObjects = useMemo((): SkelenoteObject[] => {
    if (!selectedChangePoint) return [];
    const objects = docStore.getObjectsAtVersion(selectedChangePoint.frontier);
    return objects as SkelenoteObject[];
  }, [docStore, selectedChangePoint]);

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
          setSelectedObjectId(null);
        } else {
          navigateBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateBack, selectedObjectId]);

  return (
    <div className="time-machine">
      <header className="time-machine__header">
        <button className="time-machine__back" onClick={navigateBack}>
          ← Back to Notes
        </button>
        <h1 className="time-machine__title">Time Machine</h1>
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
