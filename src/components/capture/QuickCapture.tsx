/**
 * QuickCapture - Modal for quickly capturing new objects
 */

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useObjects, useNavigation } from '@/contexts';
import { useLinkToDaily } from '@/hooks';
import { TypeSelector, type CaptureType } from './TypeSelector';
import { CaptureForm } from './CaptureForm';
import './QuickCapture.css';

/**
 * Validate if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCapture({ isOpen, onClose }: QuickCaptureProps) {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const { linkToDaily } = useLinkToDaily();
  const [selectedType, setSelectedType] = useState<CaptureType>('task');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType('task');
      setFormValues({});
    }
  }, [isOpen]);

  // Handle form field change
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Check if form is valid
  const isValid = useCallback(() => {
    if (selectedType === 'task' || selectedType === 'note') {
      return (formValues.title?.trim() ?? '') !== '';
    }
    if (selectedType === 'link') {
      const url = formValues.url?.trim() ?? '';
      return url !== '' && isValidUrl(url);
    }
    return false;
  }, [selectedType, formValues]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!store || !isValid()) return;

    let properties: Record<string, string | number | boolean | string[] | null> = {};

    if (selectedType === 'task') {
      properties = {
        title: formValues.title?.trim() ?? 'Untitled Task',
        status: 'todo',
      };
    } else if (selectedType === 'note') {
      properties = {
        title: formValues.title?.trim() ?? 'Untitled Note',
      };
    } else if (selectedType === 'link') {
      properties = {
        url: formValues.url?.trim() ?? '',
        title: formValues.title?.trim() || formValues.url?.trim() || 'Untitled Link',
      };
    }

    const newObject = store.create({
      typeId: selectedType,
      properties,
      inboxed: true,
    });

    // Link to today's daily note
    linkToDaily(newObject);

    refreshData();
    onClose();
    navigateToObject(newObject.id);
  }, [store, selectedType, formValues, isValid, linkToDaily, refreshData, onClose, navigateToObject]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div className="quick-capture__backdrop" onClick={handleBackdropClick}>
      <div
        className="quick-capture"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Capture"
      >
        {/* Header */}
        <div className="quick-capture__header">
          <h2 className="quick-capture__title">Quick Capture</h2>
          <button
            type="button"
            className="quick-capture__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="quick-capture__body">
          <TypeSelector
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />
          <CaptureForm
            type={selectedType}
            values={formValues}
            onChange={handleFieldChange}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Footer */}
        <div className="quick-capture__footer">
          <span className="quick-capture__hint">
            Press <kbd>↵</kbd> to save
          </span>
          <button
            type="button"
            className="quick-capture__button quick-capture__button--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="quick-capture__button quick-capture__button--primary"
            onClick={handleSubmit}
            disabled={!isValid()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
