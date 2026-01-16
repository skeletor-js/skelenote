/**
 * Mobile-optimized Daily Notes View
 * Features: compact week strip, swipeable weeks, full-screen editor, collapsible sections
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  Box,
  Text,
  UnstyledButton,
  Group,
  ActionIcon,
  Button,
  Loader,
  Center,
} from '@mantine/core';
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { useDailyNote, useTasks } from '@/hooks';
import { useNavigation, useObjects, useTypeRegistry } from '@/contexts';
import { RelationHelper, type Backlink } from '@/lib/loro';
import { MobileViewHeader, CollapsibleSection } from '../primitives';
import { MobileTaskRow } from '../rows';
import { Editor } from '@/components/editor';
import { IOS_CHEVRON } from '@/lib/constants/ios-styles';

// Week day labels
const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Get start of week (Sunday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get week days array
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Format long date
function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Format week label
function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}`;
}

// Check if same day
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Check if today
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function MobileDailyNotesView() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(today));

  const { dailyNote, isLoading, ensureExists } = useDailyNote(selectedDate);
  const {
    tasks: tasksForDay,
    toggleComplete,
    archiveTask,
  } = useTasks({ date: selectedDate });
  const { store, refreshData } = useObjects();
  const { navigateToObject } = useNavigation();
  const typeRegistry = useTypeRegistry();

  // Week days for current week
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Check if selected date is today (to hide Today button)
  const isSelectedToday = useMemo(() => isToday(selectedDate), [selectedDate]);

  // Check which days have notes
  const daysWithNotes = useMemo(() => {
    if (!store) return new Set<string>();
    const noteSet = new Set<string>();
    weekDays.forEach((day) => {
      const noteId = `note-${day.toISOString().split('T')[0]}`;
      if (store.get(noteId)) {
        noteSet.add(day.toISOString().split('T')[0]);
      }
    });
    return noteSet;
  }, [store, weekDays]);

  // Navigate weeks
  const goToPreviousWeek = useCallback(() => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  }, [weekStart]);

  const goToNextWeek = useCallback(() => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  }, [weekStart]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
    setWeekStart(getStartOfWeek(today));
  }, [today]);

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      // Ensure the week strip shows this date
      const newWeekStart = getStartOfWeek(date);
      if (newWeekStart.getTime() !== weekStart.getTime()) {
        setWeekStart(newWeekStart);
      }
    },
    [weekStart]
  );

  // Ensure daily note exists when selected
  const handleEditorClick = useCallback(() => {
    if (!dailyNote) {
      ensureExists();
    }
  }, [dailyNote, ensureExists]);

  // Get content
  const content = useMemo(() => {
    if (!dailyNote || !store) return null;
    try {
      return store.getContent(dailyNote.id) ?? null;
    } catch {
      return null;
    }
  }, [dailyNote, store]);

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: unknown) => {
      if (!dailyNote || !store) return;
      store.setContent(dailyNote.id, JSON.stringify(newContent));
      refreshData();
    },
    [dailyNote, store, refreshData]
  );

  // Get backlinks using RelationHelper
  const backlinks = useMemo((): Backlink[] => {
    if (!store || !dailyNote) return [];
    const relationHelper = new RelationHelper(store, typeRegistry);
    return relationHelper.findBacklinks(dailyNote.id);
  }, [store, dailyNote, typeRegistry]);

  if (isLoading) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Daily Notes" showSync showBack={false} />
        <Center style={{ flex: 1 }}>
          <Loader size="sm" color="ember" />
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader
        title="Daily Notes"
        showSync
        showSearch
        showBack={false}
        rightSection={
          !isSelectedToday ? (
            <Button variant="subtle" size="xs" onClick={goToToday}>
              Today
            </Button>
          ) : undefined
        }
      />

      {/* Week strip */}
      <Box
        style={{
          backgroundColor: 'var(--surface-paper)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {/* Week navigation */}
        <Group justify="space-between" px="md" py="xs">
          <ActionIcon variant="subtle" size={32} onClick={goToPreviousWeek}>
            <ChevronLeft size={18} />
          </ActionIcon>
          <Text size="xs" fw={500} c="dimmed">
            {formatWeekLabel(weekStart)}
          </Text>
          <ActionIcon variant="subtle" size={32} onClick={goToNextWeek}>
            <ChevronRight size={18} />
          </ActionIcon>
        </Group>

        {/* Day cells */}
        <Group gap={0} px="sm" pb="sm" justify="space-around">
          {weekDays.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const hasNote = daysWithNotes.has(date.toISOString().split('T')[0]);

            return (
              <UnstyledButton
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                style={{
                  width: 44,
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  borderRadius: 8,
                  backgroundColor: isSelected
                    ? 'var(--mantine-color-ember-5)'
                    : 'transparent',
                  position: 'relative',
                }}
              >
                <Text size="xs" c={isSelected ? 'white' : 'dimmed'}>
                  {WEEKDAY_SHORT[date.getDay()]}
                </Text>
                <Text
                  size="sm"
                  fw={isTodayDate ? 700 : 500}
                  c={isSelected ? 'white' : undefined}
                  style={{
                    textDecoration:
                      isTodayDate && !isSelected ? 'underline' : 'none',
                    textDecorationColor: 'var(--mantine-color-ember-5)',
                    textDecorationThickness: 2,
                    textUnderlineOffset: 2,
                  }}
                >
                  {date.getDate()}
                </Text>
                {/* Note indicator dot */}
                {hasNote && (
                  <Box
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.8)'
                        : 'var(--mantine-color-ember-5)',
                      position: 'absolute',
                      bottom: 4,
                    }}
                  />
                )}
              </UnstyledButton>
            );
          })}
        </Group>
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, overflow: 'auto' }} p="md">
        <Stack gap="md">
          {/* Date header */}
          <Box>
            <Text size="lg" fw={600}>
              {formatLongDate(selectedDate)}
            </Text>
            {isToday(selectedDate) && (
              <Text size="xs" c="ember" fw={500}>
                Today
              </Text>
            )}
          </Box>

          {/* Editor */}
          <Box style={{ minHeight: 200 }} onClick={handleEditorClick}>
            {dailyNote ? (
              <Editor
                objectId={dailyNote.id}
                initialContent={content}
                onContentChange={handleContentChange}
              />
            ) : (
              <Text c="dimmed" size="sm">
                Tap to start writing...
              </Text>
            )}
          </Box>

          {/* Tasks due today */}
          {tasksForDay.length > 0 && (
            <CollapsibleSection
              title="Tasks due"
              count={tasksForDay.length}
              defaultOpen
            >
              <Stack gap={0}>
                {tasksForDay.map((task) => (
                  <MobileTaskRow
                    key={task.id}
                    task={task}
                    onPress={() => navigateToObject(task.id)}
                    onToggleComplete={toggleComplete}
                    onArchive={archiveTask}
                  />
                ))}
              </Stack>
            </CollapsibleSection>
          )}

          {/* Backlinks */}
          <CollapsibleSection title="Linked from" count={backlinks.length}>
            {backlinks.length === 0 ? (
              <Stack align="center" py="md" gap="xs">
                <Link2
                  size={20}
                  style={{ color: 'var(--mantine-color-gray-4)' }}
                />
                <Text c="dimmed" size="sm">
                  No backlinks yet
                </Text>
              </Stack>
            ) : (
              <Stack gap={0}>
                {backlinks.map((link: Backlink) => {
                  const sourceObj = store?.get(link.sourceId);
                  if (!sourceObj) return null;
                  return (
                    <UnstyledButton
                      key={link.sourceId}
                      onClick={() => navigateToObject(link.sourceId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 0',
                      }}
                    >
                      <Text size="sm" truncate style={{ flex: 1 }}>
                        {
                          (sourceObj.properties.title ??
                            sourceObj.properties.name ??
                            'Untitled') as string
                        }
                      </Text>
                      <ChevronRight
                        size={IOS_CHEVRON.disclosure.size}
                        strokeWidth={IOS_CHEVRON.disclosure.strokeWidth}
                        style={{ color: IOS_CHEVRON.disclosure.color }}
                      />
                    </UnstyledButton>
                  );
                })}
              </Stack>
            )}
          </CollapsibleSection>
        </Stack>
      </Box>
    </Stack>
  );
}
