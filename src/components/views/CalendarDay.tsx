/**
 * CalendarDay - Individual day cell in the calendar grid
 */

import { isToday } from '@/lib/daily';
import './CalendarDay.css';

interface CalendarDayProps {
  /** Day number (1-31) */
  day: number;
  /** Date object for this day */
  date: Date;
  /** Whether this day has a daily note */
  hasNote: boolean;
  /** Click handler */
  onClick: () => void;
}

export function CalendarDay({ day, date, hasNote, onClick }: CalendarDayProps) {
  const today = isToday(date);

  return (
    <button
      className={`calendar-day ${today ? 'calendar-day--today' : ''} ${hasNote ? 'calendar-day--has-note' : ''}`}
      onClick={onClick}
      aria-label={`${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${hasNote ? ', has note' : ''}`}
    >
      <span className="calendar-day__number">{day}</span>
      {hasNote && <span className="calendar-day__indicator" aria-hidden="true" />}
    </button>
  );
}
