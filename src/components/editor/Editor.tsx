/**
 * BlockNote rich text editor component
 * Provides Notion-style block editing with auto-save
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import './Editor.css';
import {
  serializeBlockNoteDocument,
  deserializeBlockNoteDocument,
} from '@/lib/editor';

interface EditorProps {
  objectId: string;
  initialContent: string | null;
  onContentChange: (content: string) => void;
}

export function Editor({ objectId, initialContent, onContentChange }: EditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef<string>(initialContent ?? '');

  // Parse initial content
  const initialBlocks = useMemo(() => {
    return deserializeBlockNoteDocument(initialContent);
  }, [initialContent]);

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  // Debounced save handler
  const handleSave = useCallback(
    (blocks: Block[]) => {
      const serialized = serializeBlockNoteDocument(blocks);

      // Don't save if content hasn't changed
      if (serialized === lastSavedRef.current) {
        return;
      }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save by 300ms
      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        onContentChange(serialized);
        lastSavedRef.current = serialized;
        setIsSaving(false);
      }, 300);
    },
    [onContentChange]
  );

  // Handle editor changes
  const handleEditorChange = useCallback(() => {
    const blocks = editor.document;
    handleSave(blocks);
  }, [editor, handleSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Reset editor when objectId changes
  useEffect(() => {
    const newBlocks = deserializeBlockNoteDocument(initialContent);
    if (newBlocks) {
      editor.replaceBlocks(editor.document, newBlocks);
    } else {
      // Clear editor for new/empty content
      editor.replaceBlocks(editor.document, []);
    }
    lastSavedRef.current = initialContent ?? '';
  }, [objectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="editor-container" data-saving={isSaving}>
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        theme="dark"
      />
    </div>
  );
}
