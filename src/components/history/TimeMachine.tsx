/**
 * TimeMachine - Main container for Time Machine feature
 *
 * Phase 2: Basic calendar and timeline UI for testing
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useObjects, useNavigation } from '@/contexts';
import { CalendarView } from './CalendarView';
import { TimelineSlider } from './TimelineSlider';
import type { DayChanges, ChangePoint } from '@/lib/loro/versions';
import './TimeMachine.css';

export function TimeMachine() {
  const { docStore } = useObjects();
  const { navigateBack } = useNavigation();

  // State
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChangeIndex, setSelectedChangeIndex] = useState(0);

  // Load version history
  const { byDate } = useMemo(() => {
    const history = docStore.getVersionHistory();
    console.log('[TimeMachine] Version history loaded:', {
      changePointCount: history.changePoints.length,
      datesWithChanges: history.byDate.size,
      earliest: history.earliest ? new Date(history.earliest).toISOString() : null,
      latest: history.latest ? new Date(history.latest).toISOString() : null,
    });
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

  // Handlers
  const handleDateSelect = useCallback((date: string) => {
    console.log('[TimeMachine] Date selected:', date);
    setSelectedDate(date);
    setSelectedChangeIndex(0);
  }, []);

  const handleChangeIndexChange = useCallback((index: number) => {
    console.log('[TimeMachine] Change index changed:', index);
    setSelectedChangeIndex(index);
  }, []);

  // Log selected frontier for debugging
  useEffect(() => {
    if (selectedChangePoint) {
      console.log('[TimeMachine] Selected change point:', {
        timestamp: new Date(selectedChangePoint.timestamp).toISOString(),
        frontier: selectedChangePoint.frontier,
        peerId: selectedChangePoint.peerId,
        changeCount: selectedChangePoint.changeCount,
      });
    }
  }, [selectedChangePoint]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigateBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateBack]);

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

          {/* Debug info for Phase 2 testing */}
          {selectedChangePoint && (
            <div className="time-machine__debug">
              <h3>Selected Change Point (Debug)</h3>
              <dl>
                <dt>Timestamp</dt>
                <dd>{new Date(selectedChangePoint.timestamp).toLocaleString()}</dd>
                <dt>Peer ID</dt>
                <dd>{selectedChangePoint.peerId}</dd>
                <dt>Operations</dt>
                <dd>{selectedChangePoint.changeCount}</dd>
                <dt>Frontier</dt>
                <dd>
                  <code>
                    {JSON.stringify(selectedChangePoint.frontier, null, 2)}
                  </code>
                </dd>
              </dl>
            </div>
          )}
        </div>

        {/* Right column: Preview (Phase 3) */}
        <div className="time-machine__preview">
          {selectedChangePoint ? (
            <div className="time-machine__preview-placeholder">
              <p>
                Viewing state at{' '}
                <strong>
                  {new Date(selectedChangePoint.timestamp).toLocaleString()}
                </strong>
              </p>
              <p className="time-machine__preview-note">
                Object preview will be added in Phase 3
              </p>
            </div>
          ) : (
            <div className="time-machine__empty">
              <p>Select a date with changes to view historical state</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
