/**
 * DailyNotesView - Main view for browsing daily notes via calendar
 */

import { Calendar } from './Calendar';
import './DailyNotesView.css';

export function DailyNotesView() {
  return (
    <div className="daily-notes-view">
      <header className="daily-notes-view__header">
        <h1 className="daily-notes-view__title">Daily Notes</h1>
      </header>
      <div className="daily-notes-view__content">
        <Calendar />
      </div>
    </div>
  );
}
