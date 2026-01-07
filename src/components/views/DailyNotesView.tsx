/**
 * DailyNotesView - Week strip navigation with inline daily note content
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Stack, Box, Text, Loader, Center } from '@mantine/core';
import { ViewHeader } from '@/components/ui';
import { WeekStrip } from './WeekStrip';
import { DailyNoteHeader } from '@/components/daily';
import { Backlinks } from '@/components/object/Backlinks';
import { FindSimilar } from '@/components/object/FindSimilar';
import { DayTasksSection } from '@/components/daily/DayTasksSection';
import { Editor } from '@/components/editor';
import { ConfirmDialog } from '@/components/ui';
import {
  useObjects,
  useTypeRegistry,
  useToast,
  useSemanticSearchSafe,
} from '@/contexts';
import { useConfirmDialog } from '@/hooks';
import { getOrCreateDailyNote, getDailyNoteByDate } from '@/lib/daily';

export function DailyNotesView() {
  const { store, isLoading, refreshData, scheduleSave } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } =
    useConfirmDialog();
  const semanticContext = useSemanticSearchSafe();

  // Track previous daily note ID for flushing on date change
  const previousNoteIdRef = useRef<string | null>(null);

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Get or create daily note for selected date
  const dailyNote = useMemo(() => {
    if (!store) return null;
    return getOrCreateDailyNote(store, selectedDate);
  }, [store, selectedDate]);

  // Get the type definition for notes
  const typeDef = useMemo(() => {
    if (!dailyNote) return null;
    return typeRegistry.get(dailyNote.typeId);
  }, [dailyNote, typeRegistry]);

  // Check if any date has a note (for WeekStrip indicators)
  const hasNote = useCallback(
    (date: Date) => {
      if (!store) return false;
      return getDailyNoteByDate(store, date) !== undefined;
    },
    [store]
  );

  // Get current content for the editor
  const currentContent = useMemo(() => {
    if (!store || !dailyNote) return null;
    try {
      return store.getContent(dailyNote.id);
    } catch {
      return null;
    }
  }, [store, dailyNote]);

  // Handler for content changes
  const handleContentChange = useCallback(
    (content: string) => {
      if (!store || !dailyNote) return;
      store.setContent(dailyNote.id, content);
      scheduleSave();
      // Notify semantic search of content change (will be indexed on flush)
      semanticContext?.notifyContentChange(dailyNote.id);
    },
    [store, dailyNote, scheduleSave, semanticContext]
  );

  // Flush semantic index when switching dates or unmounting
  useEffect(() => {
    // Flush previous note when daily note changes
    if (
      previousNoteIdRef.current &&
      previousNoteIdRef.current !== dailyNote?.id
    ) {
      semanticContext?.flushContentChanges(previousNoteIdRef.current);
    }
    previousNoteIdRef.current = dailyNote?.id ?? null;

    // Flush on unmount
    return () => {
      if (previousNoteIdRef.current) {
        semanticContext?.flushContentChanges(previousNoteIdRef.current);
      }
    };
  }, [dailyNote?.id, semanticContext]);

  // Handler for date selection from WeekStrip
  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      // Refresh data to ensure we have the latest
      refreshData();
    },
    [refreshData]
  );

  // Handler for deleting the daily note
  const handleDelete = useCallback(async () => {
    if (!store || !dailyNote) return;

    const title = String(dailyNote.properties.title ?? 'Untitled');

    const confirmed = await confirm({
      title: 'Delete Daily Note?',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      store.delete(dailyNote.id);
      refreshData();
      addToast({
        type: 'success',
        message: `"${title}" has been deleted.`,
      });
    }
  }, [store, dailyNote, confirm, refreshData, addToast]);

  // Loading state
  if (isLoading || !store) {
    return (
      <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
        <ViewHeader title="Daily Notes" />
        <Center p="xl" style={{ flex: 1 }}>
          <Loader size="sm" />
          <Text ml="sm" c="dimmed">
            Loading...
          </Text>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      <ViewHeader title="Daily Notes" />

      <WeekStrip
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        hasNote={hasNote}
      />

      <Box style={{ flex: 1, overflow: 'auto' }} p="md">
        {dailyNote && typeDef && (
          <Stack gap="md">
            {/* Journal-style date header */}
            <DailyNoteHeader date={selectedDate} onDelete={handleDelete} />

            {/* Content Section with BlockNote Editor */}
            {typeDef.hasContent && (
              <Box component="section">
                <Editor
                  objectId={dailyNote.id}
                  initialContent={currentContent}
                  onContentChange={handleContentChange}
                />
              </Box>
            )}

            {/* Backlinks Section */}
            <Backlinks objectId={dailyNote.id} />

            {/* Find Similar Section (AI-powered) */}
            <FindSimilar objectId={dailyNote.id} />

            {/* Tasks Due Section */}
            <DayTasksSection date={selectedDate} />
          </Stack>
        )}
      </Box>

      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Stack>
  );
}
