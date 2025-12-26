/**
 * Calendar - Month grid component for browsing daily notes
 */

import { useCalendar } from '@/hooks';
import { useNavigation } from '@/contexts';
import { getOrCreateDailyNote } from '@/lib/daily';
import { useObjects } from '@/contexts';
import { CalendarDay } from './CalendarDay';
import './Calendar.css';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar() {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const {
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    daysInMonth,
    firstDayOffset,
    hasNote,
    getDate,
  } = useCalendar();

  const handleDayClick = (day: number) => {
    if (!store) return;

    const date = getDate(day);
    const dailyNote = getOrCreateDailyNote(store, date);
    refreshData();
    navigateToObject(dailyNote.id);
  };

  // Generate array of day numbers for the month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Generate empty cells for days before the first day of month
  const emptyDays = Array.from({ length: firstDayOffset }, (_, i) => i);

  return (
    <div className="calendar">
      {/* Header with month navigation */}
      <div className="calendar__header">
        <button
          className="calendar__nav-btn"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="calendar__month-label">{monthLabel}</h2>
        <button
          className="calendar__nav-btn"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Today button */}
      <div className="calendar__today-row">
        <button className="calendar__today-btn" onClick={goToToday}>
          Today
        </button>
      </div>

      {/* Weekday labels */}
      <div className="calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar__weekday">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="calendar__grid">
        {/* Empty cells before first day */}
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} className="calendar__empty-day" />
        ))}

        {/* Day cells */}
        {days.map((day) => (
          <CalendarDay
            key={day}
            day={day}
            date={getDate(day)}
            hasNote={hasNote(day)}
            onClick={() => handleDayClick(day)}
          />
        ))}
      </div>
    </div>
  );
}
