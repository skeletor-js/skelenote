/**
 * KeyboardShortcutsModal - Modal displaying all keyboard shortcuts
 * Triggered by Cmd+? or via Command Palette
 */

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShortcutCategory } from './ShortcutCategory';
import { getShortcutsByCategory, type ShortcutCategory as CategoryType } from '@/lib/shortcuts';
import './KeyboardShortcutsModal.css';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Get shortcuts grouped by category
  const shortcutsByCategory = getShortcutsByCategory();

  // Store previously focused element and focus close button when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      // Small delay to ensure modal is rendered
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else if (previousActiveElement.current instanceof HTMLElement) {
      // Return focus when closing
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const content = (
    <div
      className="shortcuts-modal__backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="shortcuts-modal__header">
          <h2 id="shortcuts-modal-title" className="shortcuts-modal__title">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            className="shortcuts-modal__close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="shortcuts-modal__content">
          {Array.from(shortcutsByCategory.entries()).map(([category, shortcuts]) => (
            <ShortcutCategory
              key={category}
              category={category as CategoryType}
              shortcuts={shortcuts}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="shortcuts-modal__footer">
          <span className="shortcuts-modal__hint">
            Press <kbd>Esc</kbd> or <kbd>Cmd</kbd>+<kbd>?</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
