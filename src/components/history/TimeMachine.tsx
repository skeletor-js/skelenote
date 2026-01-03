/**
 * TimeMachine - Main container for Time Machine feature
 *
 * Provides week strip and timeline navigation to browse version history,
 * view historical object snapshots, and restore previous states.
 *
 * Layout: WeekStrip → HorizontalTimeline → ObjectList
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Stack, Text, Button, Box } from '@mantine/core';
import { useObjects, useNavigation, useToast, useTypeRegistry } from '@/contexts';
import { Icon } from '@/components/ui/Icon';
import { ViewHeader } from '@/components/ui/ViewHeader';
import { getIconFromEmoji } from '@/lib/icons';
import { HistoryWeekStrip } from './HistoryWeekStrip';
import { HorizontalTimeline } from './HorizontalTimeline';
import { SnapshotPreview } from './SnapshotPreview';
import { RestoreDialog, type RestoreScope } from './RestoreDialog';
import type { DayChanges, ChangePoint, ObjectVersionHistory } from '@/lib/loro/versions';
import type { SkelenoteObject } from '@/lib/types';

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChangeIndex, setSelectedChangeIndex] = useState(0);
  // Track object ID for restore dialog (not for navigation anymore)
  const [restoreObjectId, setRestoreObjectId] = useState<string | null>(null);

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
  const historicalObjects = useMemo((): SkelenoteObject[] => {
    if (!selectedChangePoint) return [];

    const fullHistory = docStore.getVersionHistory();
    const allChangePoints = fullHistory.changePoints;

    const relevantChanges = allChangePoints.filter(
      (cp) => cp.timestamp <= selectedChangePoint.timestamp
    );

    if (relevantChanges.length === 0) return [];

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

    const allObjects = docStore.getObjectsAtVersion(cumulativeFrontier as any) as SkelenoteObject[];

    if (isFiltered && timeMachineObjectFilter) {
      const filteredObj = allObjects.find((obj) => obj.id === timeMachineObjectFilter);
      return filteredObj ? [filteredObj] : [];
    }

    return allObjects;
  }, [docStore, selectedChangePoint, isFiltered, timeMachineObjectFilter]);

  // Get current object IDs to detect deleted objects
  const currentObjectIds = useMemo((): Set<string> => {
    const fullHistory = docStore.getVersionHistory();
    const latestFrontier = fullHistory.changePoints.slice(-1)[0]?.frontier;
    if (!latestFrontier) return new Set();

    const currentObjects = docStore.getObjectsAtVersion(latestFrontier as any) as SkelenoteObject[];
    return new Set(currentObjects.map((obj) => obj.id));
  }, [docStore]);

  // Handlers
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedChangeIndex(0);
  }, []);

  const handleChangeIndexChange = useCallback((index: number) => {
    setSelectedChangeIndex(index);
  }, []);

  const handleRestoreFull = useCallback(() => {
    if (!selectedChangePoint) return;
    setRestoreDialog({
      isOpen: true,
      scope: 'full',
    });
  }, [selectedChangePoint]);

  // Handler for restoring a single object (called from inline expansion)
  const handleRestoreObject = useCallback((objectId: string) => {
    if (!selectedChangePoint) return;

    const obj = historicalObjects.find((o) => o.id === objectId);
    const title =
      (obj?.properties?.title as string) ||
      (obj?.properties?.name as string) ||
      'this object';

    setRestoreObjectId(objectId);
    setRestoreDialog({
      isOpen: true,
      scope: 'single',
      objectTitle: title,
    });
  }, [selectedChangePoint, historicalObjects]);

  const handleRestoreConfirm = useCallback(() => {
    if (!selectedChangePoint) return;

    const { scope } = restoreDialog;
    let success = false;

    if (scope === 'full') {
      success = docStore.restoreFromVersion(selectedChangePoint.frontier, {
        type: 'full',
      });
    } else if (restoreObjectId) {
      success = docStore.restoreFromVersion(selectedChangePoint.frontier, {
        type: 'single',
        objectId: restoreObjectId,
      });
    }

    setRestoreDialog({ isOpen: false, scope: 'single' });
    setRestoreObjectId(null);

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
  }, [selectedChangePoint, restoreObjectId, restoreDialog, docStore, refreshData, addToast]);

  const handleRestoreCancel = useCallback(() => {
    setRestoreDialog({ isOpen: false, scope: 'single' });
  }, []);

  const handleBackToObject = useCallback(() => {
    if (timeMachineObjectFilter) {
      navigateToObject(timeMachineObjectFilter);
    }
  }, [timeMachineObjectFilter, navigateToObject]);

  const handleViewAllHistory = useCallback(() => {
    navigateToTimeMachine();
  }, [navigateToTimeMachine]);

  const handleCompareWithCurrent = useCallback(
    (objectId: string) => {
      if (!selectedChangePoint || !selectedDate) return;
      openVersionComparison(
        objectId,
        selectedChangePoint.frontier,
        selectedChangePoint.timestamp,
        { selectedDate, changeIndex: selectedChangeIndex }
      );
    },
    [openVersionComparison, selectedChangePoint, selectedDate, selectedChangeIndex]
  );

  // Keyboard navigation (Escape handled by SnapshotPreview for expansion collapse)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Escape at this level for navigation
      // SnapshotPreview handles Escape for collapsing expanded items
      if (e.key === 'Escape') {
        if (isFiltered) {
          handleBackToObject();
        } else {
          navigateBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateBack, isFiltered, handleBackToObject]);

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Header */}
      {isFiltered ? (
        <ViewHeader
          title={objectTitle || 'History'}
          icon={filteredObjectIcon ? getIconFromEmoji(filteredObjectIcon) : 'history'}
          backButton={{
            label: 'Back',
            onClick: handleBackToObject,
          }}
          rightSection={
            <Button variant="subtle" size="xs" onClick={handleViewAllHistory}>
              All History
            </Button>
          }
        />
      ) : (
        <ViewHeader
          title="History"
          icon="history"
        />
      )}

      {/* Week Strip Navigation */}
      <HistoryWeekStrip
        selectedDate={selectedDate}
        changesByDate={byDate}
        onDateSelect={handleDateSelect}
      />

      {/* Horizontal Timeline */}
      {selectedDayChanges ? (
        <Box
          px="md"
          py="sm"
          style={{
            borderBottom: '1px solid var(--border-default)',
            flexShrink: 0,
          }}
        >
          <HorizontalTimeline
            date={selectedDate!}
            changePoints={selectedDayChanges.changePoints}
            selectedIndex={selectedChangeIndex}
            onIndexChange={handleChangeIndexChange}
          />
        </Box>
      ) : (
        <Box
          px="md"
          py="md"
          style={{
            borderBottom: '1px solid var(--border-default)',
            flexShrink: 0,
          }}
        >
          <Text size="sm" c="dimmed" ta="center">
            Select a date to view changes
          </Text>
        </Box>
      )}

      {/* Object List - scrollable */}
      <Box
        p="md"
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedChangePoint ? (
          <SnapshotPreview
            timestamp={selectedChangePoint.timestamp}
            frontier={selectedChangePoint.frontier}
            objects={historicalObjects}
            onRestore={handleRestoreFull}
            onRestoreObject={handleRestoreObject}
            onCompareWithCurrent={handleCompareWithCurrent}
            currentObjectIds={currentObjectIds}
          />
        ) : isFiltered && byDate.size === 0 ? (
          <Stack align="center" justify="center" h="100%" gap="md">
            <Text fw={500}>No recorded history for this object</Text>
            <Text size="sm" c="dimmed" ta="center">
              Changes made before history tracking was enabled are not available.
            </Text>
            <Button variant="subtle" onClick={handleViewAllHistory}>
              View All History
            </Button>
          </Stack>
        ) : (
          <Stack align="center" justify="center" h="100%">
            <Icon name="history" size={32} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text c="dimmed" ta="center">
              Select a date and time to view historical state
            </Text>
          </Stack>
        )}
      </Box>

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
    </Stack>
  );
}
