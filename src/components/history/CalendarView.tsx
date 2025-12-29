/**
 * CalendarView - Month grid with change indicators for Time Machine
 */

import { useMemo } from 'react';
import type { CalendarViewProps } from './types';
import './CalendarView.css';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a date as YYYY-MM-DD in local timezone
 */
function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayKey(): string {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function CalendarView({
  currentMonth,
  changesByDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: CalendarViewProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Format month label
  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate days in month and first day offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();

  // Generate day numbers
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  // Generate empty cells for offset
  const emptyDays = useMemo(
    () => Array.from({ length: firstDayOffset }, (_, i) => i),
    [firstDayOffset]
  );

  // Get today's date key
  const todayKey = useMemo(() => getTodayKey(), []);

  // Navigation handlers
  const goToPreviousMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Get changes info for a specific day
  const getChangesForDay = (day: number) => {
    const dateKey = formatDateKey(year, month, day);
    return changesByDate.get(dateKey);
  };

  // Determine indicator level based on change count
  const getIndicatorLevel = (totalChanges: number): string => {
    if (totalChanges > 10) return 'high';
    if (totalChanges > 3) return 'medium';
    return 'low';
  };

  return (
    <div className="tm-calendar">
      {/* Header with month navigation */}
      <div className="tm-calendar__header">
        <button
          className="tm-calendar__nav-btn"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="tm-calendar__month-label">{monthLabel}</h2>
        <button
          className="tm-calendar__nav-btn"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Today button */}
      <div className="tm-calendar__today-row">
        <button className="tm-calendar__today-btn" onClick={goToToday}>
          Today
        </button>
      </div>

      {/* Weekday labels */}
      <div className="tm-calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="tm-calendar__weekday">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="tm-calendar__grid">
        {/* Empty cells before first day */}
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} className="tm-calendar__empty-day" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = formatDateKey(year, month, day);
          const dayChanges = getChangesForDay(day);
          const hasChanges = dayChanges && dayChanges.totalChanges > 0;
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;
          const indicatorLevel = hasChanges
            ? getIndicatorLevel(dayChanges.totalChanges)
            : null;

          const className = [
            'tm-calendar__day',
            hasChanges ? 'tm-calendar__day--has-changes' : '',
            isSelected ? 'tm-calendar__day--selected' : '',
            isToday ? 'tm-calendar__day--today' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const ariaLabel = `${monthLabel.split(' ')[0]} ${day}${
            hasChanges ? `, ${dayChanges.totalChanges} changes` : ', no changes'
          }${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}`;

          return (
            <button
              key={day}
              className={className}
              onClick={() => hasChanges && onDateSelect(dateKey)}
              disabled={!hasChanges}
              aria-label={ariaLabel}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
            >
              <span className="tm-calendar__day-number">{day}</span>
              {hasChanges && (
                <span
                  className={`tm-calendar__change-indicator tm-calendar__change-indicator--${indicatorLevel}`}
                  aria-hidden="true"
                >
                  •
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
