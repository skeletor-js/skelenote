/**
 * Semantic Search Enable Modal
 *
 * Confirmation dialog shown when user first enables semantic search.
 * Shows download and indexing progress.
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SemanticProgress } from '@/lib/semantic';
import './SemanticEnableModal.css';

interface SemanticEnableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  progress: SemanticProgress | null;
  error: string | null;
}

export function SemanticEnableModal({
  isOpen,
  onClose,
  onConfirm,
  progress,
  error,
}: SemanticEnableModalProps) {
  const [isEnabling, setIsEnabling] = useState(false);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isEnabling) {
        onClose();
      }
    },
    [onClose, isEnabling]
  );

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsEnabling(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error is handled via error prop
    } finally {
      setIsEnabling(false);
    }
  };

  const handleCancel = () => {
    if (!isEnabling) {
      onClose();
    }
  };

  const renderProgressBar = () => {
    if (!progress) return null;

    return (
      <div className="semantic-modal__progress">
        <div className="semantic-modal__progress-bar">
          <div
            className="semantic-modal__progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="semantic-modal__progress-text">
          {progress.message}
          {progress.current !== undefined && progress.total !== undefined && (
            <span className="semantic-modal__progress-count">
              {' '}({progress.current} / {progress.total})
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render different modal content based on state
  let modalContent: React.ReactNode;

  // Show progress view when enabling
  if (isEnabling && !error) {
    modalContent = (
      <div className="semantic-modal" role="dialog" aria-modal="true">
        <div className="semantic-modal__header">
          <h2 className="semantic-modal__title">Setting up Semantic Search...</h2>
        </div>
        <div className="semantic-modal__body">
          {progress?.operation === 'download' && (
            <p className="semantic-modal__description">
              Downloading AI model... This only happens once.
            </p>
          )}
          {progress?.operation === 'load' && (
            <p className="semantic-modal__description">
              Loading model into memory...
            </p>
          )}
          {progress?.operation === 'index' && (
            <p className="semantic-modal__description">
              Building search index...
            </p>
          )}
          {renderProgressBar()}
        </div>
      </div>
    );
  }
  // Show error view
  else if (error) {
    modalContent = (
      <div className="semantic-modal" role="dialog" aria-modal="true">
        <div className="semantic-modal__header">
          <h2 className="semantic-modal__title">Setup Failed</h2>
          <button className="semantic-modal__close" onClick={handleCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="semantic-modal__body">
          <p className="semantic-modal__error">{error}</p>
          <p className="semantic-modal__description">
            Please check your internet connection and try again.
          </p>
        </div>
        <div className="semantic-modal__footer">
          <button className="semantic-modal__button semantic-modal__button--secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="semantic-modal__button semantic-modal__button--primary" onClick={handleConfirm}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  // Show confirmation view
  else {
    modalContent = (
      <div className="semantic-modal" role="dialog" aria-modal="true">
        <div className="semantic-modal__header">
          <h2 className="semantic-modal__title">Enable Semantic Search?</h2>
          <button className="semantic-modal__close" onClick={handleCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="semantic-modal__body">
          <p className="semantic-modal__description">
            This will download a 23MB AI model to enable concept-based search.
            All processing happens locally on this device.
          </p>

          <div className="semantic-modal__section">
            <h3 className="semantic-modal__section-title">What you'll get:</h3>
            <ul className="semantic-modal__list">
              <li>Find related notes even with different wording</li>
              <li>"Find similar" suggestions on every object</li>
              <li>Conceptual matches alongside keyword results</li>
            </ul>
          </div>

          <div className="semantic-modal__section">
            <h3 className="semantic-modal__section-title">Requirements:</h3>
            <ul className="semantic-modal__list">
              <li>One-time 23MB download</li>
              <li>~500MB RAM when active</li>
              <li>Works offline after initial download</li>
            </ul>
          </div>
        </div>
        <div className="semantic-modal__footer">
          <button className="semantic-modal__button semantic-modal__button--secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="semantic-modal__button semantic-modal__button--primary" onClick={handleConfirm}>
            Download & Enable
          </button>
        </div>
      </div>
    );
  }

  return createPortal(
    <div className="semantic-modal__backdrop" onClick={handleBackdropClick}>
      {modalContent}
    </div>,
    document.body
  );
}
