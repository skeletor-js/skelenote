/**
 * BlockNote rich text editor component
 * Provides Notion-style block editing with auto-save and @-mentions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCreateBlockNote, SuggestionMenuController } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import './Editor.css';
import {
  editorSchema,
  serializeBlockNoteDocument,
  deserializeBlockNoteDocument,
  getPendingMention,
  clearPendingMention,
  isMentionClipboardText,
} from '@/lib/editor';
import { getMentionMenuItems, MentionSuggestionMenu, type MentionItem } from './MentionSuggestion';
import { useObjects, useTypeRegistry, useTheme } from '@/contexts';

interface EditorProps {
  objectId: string;
  initialContent: string | null;
  onContentChange: (content: string) => void;
}

export function Editor({ objectId, initialContent, onContentChange }: EditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef<string>(initialContent ?? '');

  // Get object store and type registry for mentions
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { theme } = useTheme();

  // Parse initial content
  const initialBlocks = useMemo(() => {
    return deserializeBlockNoteDocument(initialContent);
  }, [initialContent]);

  // Create BlockNote editor with custom schema
  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: initialBlocks,
  });

  // Get mention suggestions based on query (excludes current object to prevent self-mentions)
  const getMentionItems = useCallback(
    (query: string): MentionItem[] => {
      return getMentionMenuItems(store, typeRegistry, query, objectId);
    },
    [store, typeRegistry, objectId]
  );

  // Debounced save handler
  const handleSave = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (blocks: any[]) => {
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

  // Handle paste events to intercept mention clipboard data
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const clipboardText = e.clipboardData?.getData('text/plain') || '';

      // Check if this is a Skelenote mention paste
      if (isMentionClipboardText(clipboardText)) {
        const pendingMention = getPendingMention();
        if (pendingMention) {
          // Prevent default paste behavior
          e.preventDefault();
          e.stopPropagation();

          // Insert the mention at cursor position
          editor.insertInlineContent([
            {
              type: 'mention',
              props: {
                objectId: pendingMention.objectId,
                objectName: pendingMention.objectName,
                objectTypeId: pendingMention.objectTypeId,
              },
            },
            ' ', // Add space after mention
          ]);

          // Clear the pending mention
          clearPendingMention();
        }
      }
    };

    container.addEventListener('paste', handlePaste, true);
    return () => {
      container.removeEventListener('paste', handlePaste, true);
    };
  }, [editor]);

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
    <div ref={containerRef} className="editor-container" data-saving={isSaving}>
      <BlockNoteView
        editor={editor}
        onChange={handleEditorChange}
        theme={theme}
        sideMenu={false}
      >
        <SuggestionMenuController<(query: string) => Promise<MentionItem[]>>
          triggerCharacter="@"
          getItems={async (query) => getMentionItems(query)}
          suggestionMenuComponent={MentionSuggestionMenu}
          onItemClick={(item: MentionItem) => {
            editor.insertInlineContent([
              {
                type: 'mention',
                props: {
                  objectId: item.objectId,
                  objectName: item.objectName,
                  objectTypeId: item.objectTypeId,
                },
              },
              ' ', // Add space after mention
            ]);
          }}
        />
      </BlockNoteView>
    </div>
  );
}
