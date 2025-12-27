/**
 * EmptyState - Reusable empty state component
 * Displays a centered message when a list or view has no content
 */

import './EmptyState.css';

interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional icon (emoji or text) */
  icon?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

export function EmptyState({
  message,
  icon,
  size = 'medium',
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${size}`}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      <p className="empty-state__message">{message}</p>
    </div>
  );
}
