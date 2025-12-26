/**
 * DailyNoteHeader - Navigation header for daily note detail view
 */

import { useCallback } from 'react';
import { useNavigation, useObjects } from '@/contexts';
import { getAdjacentDailyNote, formatDateTitle } from '@/lib/daily';
import './DailyNoteHeader.css';

interface DailyNoteHeaderProps {
  /** The timestamp of the current daily note's date */
  dateTimestamp: number;
}

export function DailyNoteHeader({ dateTimestamp }: DailyNoteHeaderProps) {
  const { store, refreshData } = useObjects();
  const { navigateToObject, navigateToView } = useNavigation();

  const currentDate = new Date(dateTimestamp);
  const dateLabel = formatDateTitle(currentDate);

  const handlePreviousDay = useCallback(() => {
    if (!store) return;
    const prevNote = getAdjacentDailyNote(store, currentDate, -1);
    refreshData();
    navigateToObject(prevNote.id);
  }, [store, currentDate, refreshData, navigateToObject]);

  const handleNextDay = useCallback(() => {
    if (!store) return;
    const nextNote = getAdjacentDailyNote(store, currentDate, 1);
    refreshData();
    navigateToObject(nextNote.id);
  }, [store, currentDate, refreshData, navigateToObject]);

  const handleGoToCalendar = useCallback(() => {
    navigateToView('daily-notes');
  }, [navigateToView]);

  return (
    <div className="daily-note-header">
      <div className="daily-note-header__nav">
        <button
          className="daily-note-header__nav-btn"
          onClick={handlePreviousDay}
          aria-label="Previous day"
        >
          ← Prev
        </button>
        <span className="daily-note-header__date">{dateLabel}</span>
        <button
          className="daily-note-header__nav-btn"
          onClick={handleNextDay}
          aria-label="Next day"
        >
          Next →
        </button>
      </div>
      <button
        className="daily-note-header__calendar-btn"
        onClick={handleGoToCalendar}
        aria-label="Back to calendar"
      >
        Calendar
      </button>
    </div>
  );
}
