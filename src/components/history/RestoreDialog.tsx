/**
 * RestoreDialog - Confirmation dialog for restoring historical versions
 *
 * Shows timestamp, scope info, and warnings about the restore operation.
 */

import { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './RestoreDialog.css';

export type RestoreScope = 'single' | 'full';

export interface RestoreDialogProps {
  isOpen: boolean;
  /** Scope of the restore operation */
  scope: RestoreScope;
  /** Timestamp of the version being restored */
  timestamp: number;
  /** Title of the object (for single restore) */
  objectTitle?: string;
  /** Number of objects (for full restore) */
  objectCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreDialog({
  isOpen,
  scope,
  timestamp,
  objectTitle,
  objectCount,
  onConfirm,
  onCancel,
}: RestoreDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Format the timestamp
  const formattedTimestamp = useMemo(() => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [timestamp]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }

      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = scope === 'single' ? 'Restore Object' : 'Restore All Objects';
  const description =
    scope === 'single'
      ? `Restore "${objectTitle}" to its state at:`
      : `Restore all ${objectCount} objects to their state at:`;

  return createPortal(
    <div className="restore-dialog-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="restore-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restore-dialog-title"
        aria-describedby="restore-dialog-description"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="restore-dialog__icon">
          {scope === 'single' ? '📄' : '📚'}
        </div>

        <h2 id="restore-dialog-title" className="restore-dialog__title">
          {title}
        </h2>

        <p id="restore-dialog-description" className="restore-dialog__description">
          {description}
        </p>

        <div className="restore-dialog__timestamp">
          {formattedTimestamp}
        </div>

        <div className="restore-dialog__warnings">
          <div className="restore-dialog__warning">
            <span className="restore-dialog__warning-icon">i</span>
            <span>This operation merges historical data with your current state using CRDT.</span>
          </div>
          <div className="restore-dialog__warning">
            <span className="restore-dialog__warning-icon">i</span>
            <span>All changes are preserved in history - nothing is permanently lost.</span>
          </div>
          <div className="restore-dialog__warning">
            <span className="restore-dialog__warning-icon">i</span>
            <span>Changes will sync to all connected devices.</span>
          </div>
        </div>

        <div className="restore-dialog__actions">
          <button
            type="button"
            className="restore-dialog__button restore-dialog__button--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="restore-dialog__button restore-dialog__button--confirm"
            onClick={onConfirm}
          >
            Restore
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
