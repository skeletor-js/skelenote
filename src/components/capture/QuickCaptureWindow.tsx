/**
 * QuickCaptureWindow - Standalone window for Quick Capture
 * This is rendered when the app is opened with ?window=quick-capture
 */

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useObjects, useNavigation } from '@/contexts';
import { TypeSelector, type CaptureType } from './TypeSelector';
import { CaptureForm } from './CaptureForm';
import './QuickCaptureWindow.css';

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

export function QuickCaptureWindow() {
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const [selectedType, setSelectedType] = useState<CaptureType>('task');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

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

  // Close the window
  const closeWindow = useCallback(async () => {
    try {
      await invoke('close_quick_capture');
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
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

    refreshData();

    // Close the quick capture window
    await closeWindow();

    // Navigate to the object in the main window
    navigateToObject(newObject.id);
  }, [store, selectedType, formValues, isValid, refreshData, closeWindow, navigateToObject]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeWindow]);

  return (
    <div className="quick-capture-window">
      {/* Header */}
      <div className="quick-capture-window__header" data-tauri-drag-region>
        <h2 className="quick-capture-window__title">Quick Capture</h2>
        <button
          type="button"
          className="quick-capture-window__close"
          onClick={closeWindow}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="quick-capture-window__body">
        <TypeSelector selectedType={selectedType} onSelectType={setSelectedType} />
        <CaptureForm
          type={selectedType}
          values={formValues}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Footer */}
      <div className="quick-capture-window__footer">
        <span className="quick-capture-window__hint">
          Press <kbd>↵</kbd> to save · <kbd>esc</kbd> to close
        </span>
        <button
          type="button"
          className="quick-capture-window__button quick-capture-window__button--primary"
          onClick={handleSubmit}
          disabled={!isValid()}
        >
          Save
        </button>
      </div>
    </div>
  );
}
