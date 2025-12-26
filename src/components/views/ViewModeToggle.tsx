/**
 * ViewModeToggle - switches between list and kanban view modes
 */

import './ViewModeToggle.css';

export type ViewMode = 'list' | 'kanban';

interface ViewModeToggleProps {
  /** Current view mode */
  mode: ViewMode;
  /** Callback when mode changes */
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="view-mode-toggle" role="tablist" aria-label="View mode">
      <button
        className={`view-mode-toggle__btn ${mode === 'list' ? 'view-mode-toggle__btn--active' : ''}`}
        onClick={() => onChange('list')}
        role="tab"
        aria-selected={mode === 'list'}
        aria-controls="task-view-content"
      >
        <span className="view-mode-toggle__icon">☰</span>
        <span className="view-mode-toggle__label">List</span>
      </button>
      <button
        className={`view-mode-toggle__btn ${mode === 'kanban' ? 'view-mode-toggle__btn--active' : ''}`}
        onClick={() => onChange('kanban')}
        role="tab"
        aria-selected={mode === 'kanban'}
        aria-controls="task-view-content"
      >
        <span className="view-mode-toggle__icon">▦</span>
        <span className="view-mode-toggle__label">Board</span>
      </button>
    </div>
  );
}
