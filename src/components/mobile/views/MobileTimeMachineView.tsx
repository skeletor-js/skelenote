/**
 * Mobile-optimized Time Machine View
 * Features: Week strip navigation, change point list, restore functionality
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  Text,
  Box,
  ScrollArea,
  Button,
  Group,
  Badge,
  ActionIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  History,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useObjects, useToast } from '@/contexts';
import { useHaptics } from '@/hooks';
import { MobileViewHeader, EmptyState } from '../primitives';
import { RestoreConfirmSheet, type RestoreScope } from '../sheets';
import type { DayChanges, ChangePoint } from '@/lib/loro/versions';
import type { SkelenoteObject } from '@/lib/types';
import type { Frontiers } from 'loro-crdt';

// Week day labels
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Format a Date as YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the Monday of the week containing the given date (ISO week start)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate array of 7 dates for the week starting from Monday
 */
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Check if two dates are the same day
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Format week range label (e.g., "Dec 23 - 29")
 */
function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}`;
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatTime(timestamp);
}

export function MobileTimeMachineView() {
  const { docStore, refreshData } = useObjects();
  const { addToast } = useToast();
  const { impact, notification } = useHaptics();

  // State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChangePoint, setSelectedChangePoint] =
    useState<ChangePoint | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load version history
  const { byDate, changePoints } = useMemo(() => {
    const history = docStore.getVersionHistory();
    return {
      byDate: history.byDate,
      changePoints: history.changePoints,
    };
  }, [docStore]);

  // Get the week to display
  const displayWeekStart = useMemo(() => {
    if (selectedDate) {
      return getWeekStart(parseDateKey(selectedDate));
    }
    // Default to week containing most recent change
    const dates = Array.from(byDate.keys()).sort().reverse();
    if (dates.length > 0) {
      return getWeekStart(parseDateKey(dates[0]));
    }
    return getWeekStart(new Date());
  }, [selectedDate, byDate]);

  // Generate week days
  const weekDays = useMemo(
    () => getWeekDays(displayWeekStart),
    [displayWeekStart]
  );

  // Get changes for selected date
  const selectedDayChanges = useMemo((): DayChanges | null => {
    if (!selectedDate) return null;
    return byDate.get(selectedDate) ?? null;
  }, [selectedDate, byDate]);

  // Get objects at the selected frontier
  const historicalObjects = useMemo((): SkelenoteObject[] => {
    if (!selectedChangePoint) return [];

    const allChangePoints = changePoints;
    const relevantChanges = allChangePoints.filter(
      (cp) => cp.timestamp <= selectedChangePoint.timestamp
    );

    if (relevantChanges.length === 0) return [];

    const peerMaxCounters = new Map<string, number>();
    for (const cp of relevantChanges) {
      const frontierOp = cp.frontier[0];
      if (!frontierOp) continue;
      const current = peerMaxCounters.get(cp.peerId) ?? -1;
      if (frontierOp.counter > current) {
        peerMaxCounters.set(cp.peerId, frontierOp.counter);
      }
    }

    const cumulativeFrontier: Array<{ peer: string; counter: number }> = [];
    for (const [peer, counter] of peerMaxCounters) {
      cumulativeFrontier.push({ peer, counter });
    }

    if (cumulativeFrontier.length === 0) return [];

    return docStore.getObjectsAtVersion(
      cumulativeFrontier as Frontiers
    ) as SkelenoteObject[];
  }, [docStore, selectedChangePoint, changePoints]);

  // Get max changes in week for bar sizing
  const maxChangesInWeek = useMemo(() => {
    let max = 0;
    for (const date of weekDays) {
      const dateKey = formatDateKey(date);
      const dayChanges = byDate.get(dateKey);
      if (dayChanges && dayChanges.totalChanges > max) {
        max = dayChanges.totalChanges;
      }
    }
    return max;
  }, [weekDays, byDate]);

  // Calculate bar height as percentage
  const getBarHeight = useCallback(
    (totalChanges: number): number => {
      if (maxChangesInWeek === 0) return 0;
      const ratio = totalChanges / maxChangesInWeek;
      if (ratio <= 0.25) return 25;
      if (ratio <= 0.5) return 50;
      if (ratio <= 0.75) return 75;
      return 100;
    },
    [maxChangesInWeek]
  );

  // Find week with changes for navigation
  const findWeekWithChanges = useCallback(
    (
      currentWeekStart: Date,
      direction: 'forward' | 'backward'
    ): string | null => {
      const offset = direction === 'forward' ? 7 : -7;
      const targetWeekStart = new Date(currentWeekStart);
      targetWeekStart.setDate(targetWeekStart.getDate() + offset);

      const sortedDates = Array.from(byDate.keys()).sort();

      if (direction === 'forward') {
        const targetStartKey = formatDateKey(targetWeekStart);
        return sortedDates.find((d) => d >= targetStartKey) ?? null;
      } else {
        const currentStartKey = formatDateKey(currentWeekStart);
        return (
          [...sortedDates].reverse().find((d) => d < currentStartKey) ?? null
        );
      }
    },
    [byDate]
  );

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    const prevWeekDay = findWeekWithChanges(displayWeekStart, 'backward');
    if (prevWeekDay) {
      impact('light');
      setSelectedDate(prevWeekDay);
      setSelectedChangePoint(null);
    }
  }, [displayWeekStart, findWeekWithChanges, impact]);

  const goToNextWeek = useCallback(() => {
    const nextWeekDay = findWeekWithChanges(displayWeekStart, 'forward');
    if (nextWeekDay) {
      impact('light');
      setSelectedDate(nextWeekDay);
      setSelectedChangePoint(null);
    }
  }, [displayWeekStart, findWeekWithChanges, impact]);

  const handleDateSelect = useCallback(
    (dateKey: string) => {
      impact('light');
      setSelectedDate(dateKey);
      setSelectedChangePoint(null);
    },
    [impact]
  );

  const handleChangePointSelect = useCallback(
    (cp: ChangePoint) => {
      impact('light');
      setSelectedChangePoint(cp === selectedChangePoint ? null : cp);
    },
    [selectedChangePoint, impact]
  );

  // Check navigation availability
  const hasPrevWeek = useMemo(() => {
    return findWeekWithChanges(displayWeekStart, 'backward') !== null;
  }, [displayWeekStart, findWeekWithChanges]);

  const hasNextWeek = useMemo(() => {
    return findWeekWithChanges(displayWeekStart, 'forward') !== null;
  }, [displayWeekStart, findWeekWithChanges]);

  // Check if selected version is the latest
  const isLatestVersion = useMemo(() => {
    if (!selectedChangePoint || changePoints.length === 0) return true;
    const latest = changePoints[changePoints.length - 1];
    return selectedChangePoint.timestamp === latest.timestamp;
  }, [selectedChangePoint, changePoints]);

  // Restore handlers
  const handleRestoreClick = useCallback(() => {
    if (selectedChangePoint && !isLatestVersion) {
      impact('medium');
      setRestoreConfirmOpen(true);
    }
  }, [selectedChangePoint, isLatestVersion, impact]);

  const handleRestoreConfirm = useCallback(
    (scope: RestoreScope) => {
      if (!selectedChangePoint) return;

      setIsRestoring(true);
      try {
        const restoreOptions =
          scope === 'all'
            ? { type: 'full' as const }
            : { type: 'full' as const };

        const success = docStore.restoreFromVersion(
          selectedChangePoint.frontier,
          restoreOptions
        );

        if (success) {
          refreshData();
          notification('success');
          addToast({
            type: 'success',
            message:
              scope === 'all'
                ? 'All objects restored to this version'
                : 'Restored successfully',
          });
          setRestoreConfirmOpen(false);
          setSelectedChangePoint(null);
        } else {
          notification('error');
          addToast({
            type: 'error',
            message: 'Failed to restore version',
          });
        }
      } catch (error) {
        notification('error');
        addToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to restore version',
        });
      } finally {
        setIsRestoring(false);
      }
    },
    [docStore, selectedChangePoint, refreshData, addToast, notification]
  );

  // Empty state if no history
  if (changePoints.length === 0) {
    return (
      <Stack gap={0} h="100%">
        <MobileViewHeader title="Time Machine" showBack />
        <Box style={{ flex: 1 }} p="md">
          <EmptyState
            icon={History}
            title="No History Yet"
            description="Changes will appear here as you create and edit objects. Your version history is stored locally."
          />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Time Machine" showBack />

      {/* Week Navigation */}
      <Box
        px="md"
        py="sm"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        {/* Week label */}
        <Text size="xs" c="dimmed" ta="center" mb="xs">
          {formatWeekLabel(displayWeekStart)}
        </Text>

        {/* Week strip */}
        <Group justify="center" gap="xs">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={!hasPrevWeek}
          >
            <ChevronsLeft size={16} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={!hasPrevWeek}
          >
            <ChevronLeft size={14} />
          </ActionIcon>

          {weekDays.map((date, index) => {
            const dateKey = formatDateKey(date);
            const isSelected = selectedDate === dateKey;
            const isTodayDate = isToday(date);
            const dayChanges = byDate.get(dateKey);
            const hasChanges = dayChanges && dayChanges.totalChanges > 0;
            const barHeight = hasChanges
              ? getBarHeight(dayChanges.totalChanges)
              : 0;

            return (
              <UnstyledButton
                key={dateKey}
                onClick={() => hasChanges && handleDateSelect(dateKey)}
                disabled={!hasChanges}
                style={{
                  width: 36,
                  height: 48,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: isSelected
                    ? 'var(--mantine-color-ember-5)'
                    : 'transparent',
                  opacity: hasChanges ? 1 : 0.4,
                  position: 'relative',
                }}
              >
                <Text
                  size="xs"
                  c={isSelected ? 'white' : 'dimmed'}
                  style={{ lineHeight: 1 }}
                >
                  {WEEKDAY_LABELS[index]}
                </Text>
                <Text
                  size="sm"
                  fw={isTodayDate ? 700 : 500}
                  c={isSelected ? 'white' : undefined}
                  style={{ lineHeight: 1.2 }}
                >
                  {date.getDate()}
                </Text>
                {/* Activity bar */}
                {hasChanges && (
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: `${barHeight}%`,
                      maxWidth: 20,
                      height: 2,
                      borderRadius: 1,
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.7)'
                        : 'var(--mantine-color-ember-5)',
                    }}
                  />
                )}
              </UnstyledButton>
            );
          })}

          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={goToNextWeek}
            disabled={!hasNextWeek}
          >
            <ChevronRight size={14} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={goToNextWeek}
            disabled={!hasNextWeek}
          >
            <ChevronsRight size={16} />
          </ActionIcon>
        </Group>
      </Box>

      {/* Change point list */}
      <ScrollArea style={{ flex: 1 }}>
        {selectedDate && selectedDayChanges ? (
          <Stack gap={0} p="md">
            <Text size="sm" fw={500} mb="sm">
              {parseDateKey(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            {selectedDayChanges.changePoints.map((cp, index) => {
              const isSelected = selectedChangePoint === cp;
              const isLatest =
                index === selectedDayChanges.changePoints.length - 1;

              return (
                <UnstyledButton
                  key={`${cp.timestamp}-${cp.peerId}`}
                  onClick={() => handleChangePointSelect(cp)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                    border: isSelected
                      ? '2px solid var(--mantine-color-ember-5)'
                      : '1px solid var(--border-default)',
                    backgroundColor: isSelected
                      ? 'var(--mantine-color-ember-0)'
                      : 'var(--surface-paper)',
                  }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs">
                        <Clock
                          size={14}
                          style={{ color: 'var(--mantine-color-gray-5)' }}
                        />
                        <Text size="sm" fw={500}>
                          {formatTime(cp.timestamp)}
                        </Text>
                        {isLatest && (
                          <Badge size="xs" variant="light" color="sage">
                            Latest
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {formatRelativeTime(cp.timestamp)}
                      </Text>
                    </Group>

                    <Group gap="xs">
                      {cp.deviceName && (
                        <Text size="xs" c="dimmed">
                          {cp.deviceName}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {cp.changeCount} change{cp.changeCount !== 1 ? 's' : ''}
                      </Text>
                      {cp.isFromRevokedDevice && (
                        <Badge size="xs" variant="light" color="brick">
                          Revoked
                        </Badge>
                      )}
                    </Group>

                    {/* Restore button when selected and not latest */}
                    {isSelected && !isLatestVersion && (
                      <Button
                        variant="filled"
                        color="ember"
                        size="sm"
                        leftSection={<RotateCcw size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreClick();
                        }}
                        mt="xs"
                      >
                        Restore to this version
                      </Button>
                    )}

                    {/* Show affected objects count */}
                    {isSelected && (
                      <Text size="xs" c="dimmed" mt="xs">
                        {historicalObjects.length} object
                        {historicalObjects.length !== 1 ? 's' : ''} at this
                        version
                      </Text>
                    )}
                  </Stack>
                </UnstyledButton>
              );
            })}
          </Stack>
        ) : (
          <Box p="xl">
            <Stack align="center" gap="md">
              <History
                size={40}
                style={{ color: 'var(--mantine-color-gray-4)' }}
              />
              <Text c="dimmed" ta="center">
                Select a date with changes to browse history
              </Text>
            </Stack>
          </Box>
        )}
      </ScrollArea>

      {/* Restore confirmation sheet */}
      <RestoreConfirmSheet
        opened={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        versionName={
          selectedChangePoint ? formatTime(selectedChangePoint.timestamp) : ''
        }
        objectName="all objects"
        showRestoreAllOption={false}
        onConfirm={handleRestoreConfirm}
        isRestoring={isRestoring}
      />
    </Stack>
  );
}
