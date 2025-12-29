/**
 * Time Machine Component Types
 */

import type { Frontiers } from 'loro-crdt';
import type { SkelenoteObject } from '@/lib/types';
import type { ChangePoint, DayChanges } from '@/lib/loro/versions';

/**
 * State for the Time Machine view
 */
export interface TimeMachineState {
  /** All change points extracted from history */
  changePoints: ChangePoint[];
  /** Changes grouped by date */
  changesByDate: Map<string, DayChanges>;
  /** Currently selected date (YYYY-MM-DD) */
  selectedDate: string | null;
  /** Currently selected change point index within the day */
  selectedChangeIndex: number;
  /** Objects at the selected point in time */
  historicalObjects: SkelenoteObject[];
  /** Currently previewing object ID */
  previewObjectId: string | null;
  /** Whether data is loading */
  isLoading: boolean;
}

/**
 * Props for CalendarView component
 */
export interface CalendarViewProps {
  /** The month currently displayed */
  currentMonth: Date;
  /** Changes grouped by date for indicator display */
  changesByDate: Map<string, DayChanges>;
  /** Currently selected date (YYYY-MM-DD) or null */
  selectedDate: string | null;
  /** Callback when a date is selected */
  onDateSelect: (date: string) => void;
  /** Callback when month navigation occurs */
  onMonthChange: (month: Date) => void;
}

/**
 * Props for TimelineSlider component
 */
export interface TimelineSliderProps {
  /** The date being displayed (YYYY-MM-DD) */
  date: string;
  /** Change points for this date */
  changePoints: ChangePoint[];
  /** Currently selected change point index */
  selectedIndex: number;
  /** Callback when selection changes */
  onIndexChange: (index: number) => void;
}

/**
 * Props for SnapshotPreview component
 */
export interface SnapshotPreviewProps {
  /** Timestamp of the selected point */
  timestamp: number;
  /** Frontier at the selected point */
  frontier: Frontiers;
  /** Objects at the selected point */
  objects: SkelenoteObject[];
  /** Callback when an object is selected for preview */
  onObjectSelect: (objectId: string) => void;
  /** Callback to restore the entire state */
  onRestore: () => void;
  /** Callback to compare a specific object with current */
  onCompareWithCurrent: (objectId: string) => void;
}

/**
 * Props for ObjectPreview component
 */
export interface ObjectPreviewProps {
  /** The historical object to preview */
  object: SkelenoteObject;
  /** Frontier at the selected point */
  frontier: Frontiers;
  /** Timestamp of the selected point */
  timestamp: number;
  /** Callback to restore this object */
  onRestore: () => void;
  /** Callback to compare with current version */
  onCompareWithCurrent: () => void;
  /** Callback to close the preview */
  onClose: () => void;
}

/**
 * Restore scope configuration
 */
export type RestoreScope =
  | { type: 'full'; objectCount: number }
  | { type: 'single'; objectId: string; objectTitle: string };

/**
 * Props for RestoreDialog component
 */
export interface RestoreDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Timestamp being restored from */
  timestamp: number;
  /** Scope of the restore operation */
  scope: RestoreScope;
  /** Callback when restore is confirmed */
  onConfirm: () => void;
  /** Callback when restore is cancelled */
  onCancel: () => void;
}

/**
 * Props for HistoricalObjectView (split pane version comparison)
 */
export interface HistoricalObjectViewProps {
  /** Object ID to display */
  objectId: string;
  /** Frontier for the historical state */
  frontier: Frontiers;
  /** Timestamp for display */
  timestamp: number;
  /** Callback to close the view */
  onClose: () => void;
}
