/**
 * HorizontalTimeline - Horizontal scrubber for navigating changes within a day
 * Replaces the vertical TimelineSlider with a more compact horizontal design
 */

import { useCallback, useMemo, useRef } from 'react';
import { Box, Text, Group, ActionIcon, Tooltip, Stack } from '@mantine/core';
import { Icon } from '@/components/ui/Icon';
import type { TimelineSliderProps } from './types';

/**
 * Format a timestamp as a time string (e.g., "2:30 PM")
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a date string for display
 */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface TooltipContentProps {
  timestamp: number;
  changeCount: number;
  deviceName?: string;
  isFromRevokedDevice?: boolean;
}

function TooltipContent({ timestamp, changeCount, deviceName, isFromRevokedDevice }: TooltipContentProps) {
  return (
    <Stack gap={2}>
      <Text size="sm" fw={500}>{formatTime(timestamp)}</Text>
      <Text size="xs" c="dimmed">
        {changeCount} operation{changeCount !== 1 ? 's' : ''}
      </Text>
      {deviceName && (
        <Text size="xs" c={isFromRevokedDevice ? 'red' : 'dimmed'}>
          {deviceName}{isFromRevokedDevice && ' (revoked)'}
        </Text>
      )}
    </Stack>
  );
}

// Reuse TimelineSliderProps interface for compatibility
export function HorizontalTimeline({
  date,
  changePoints,
  selectedIndex,
  onIndexChange,
}: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Sort change points by time (ascending for left-to-right display)
  const sortedChangePoints = useMemo(() => {
    return [...changePoints].sort((a, b) => a.timestamp - b.timestamp);
  }, [changePoints]);

  // Map sorted index back to original index
  const getOriginalIndex = useCallback(
    (sortedIndex: number) => {
      const sortedPoint = sortedChangePoints[sortedIndex];
      return changePoints.findIndex(
        (cp) => cp.timestamp === sortedPoint.timestamp && cp.peerId === sortedPoint.peerId
      );
    },
    [changePoints, sortedChangePoints]
  );

  // Find the sorted index for the currently selected item
  const selectedSortedIndex = useMemo(() => {
    if (selectedIndex < 0 || selectedIndex >= changePoints.length) return -1;
    const selectedPoint = changePoints[selectedIndex];
    return sortedChangePoints.findIndex(
      (cp) => cp.timestamp === selectedPoint.timestamp && cp.peerId === selectedPoint.peerId
    );
  }, [changePoints, sortedChangePoints, selectedIndex]);

  // Calculate marker positions and sizes
  const { markers, earliestTime, latestTime } = useMemo(() => {
    if (sortedChangePoints.length === 0) {
      return { markers: [], earliestTime: 0, latestTime: 0 };
    }

    const earliest = sortedChangePoints[0].timestamp;
    const latest = sortedChangePoints[sortedChangePoints.length - 1].timestamp;
    const maxChangeCount = Math.max(...sortedChangePoints.map((cp) => cp.changeCount));

    const markers = sortedChangePoints.map((point, sortedIndex) => {
      // Position: 0-100% based on timestamp
      let position: number;
      if (earliest === latest) {
        position = 50; // Single point: center it
      } else {
        position = ((point.timestamp - earliest) / (latest - earliest)) * 100;
      }

      // Size: 6-14px based on relative changeCount
      const ratio = point.changeCount / maxChangeCount;
      const size = 6 + ratio * 8;

      return {
        ...point,
        sortedIndex,
        originalIndex: getOriginalIndex(sortedIndex),
        position,
        size,
      };
    });

    return { markers, earliestTime: earliest, latestTime: latest };
  }, [sortedChangePoints, getOriginalIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (selectedSortedIndex > 0) {
            onIndexChange(getOriginalIndex(selectedSortedIndex - 1));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (selectedSortedIndex < sortedChangePoints.length - 1) {
            onIndexChange(getOriginalIndex(selectedSortedIndex + 1));
          }
          break;
        case 'Home':
          e.preventDefault();
          onIndexChange(getOriginalIndex(0));
          break;
        case 'End':
          e.preventDefault();
          onIndexChange(getOriginalIndex(sortedChangePoints.length - 1));
          break;
      }
    },
    [selectedSortedIndex, sortedChangePoints.length, onIndexChange, getOriginalIndex]
  );

  // Click on track to select nearest marker
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || markers.length === 0) return;

      const rect = trackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercent = (clickX / rect.width) * 100;

      // Find nearest marker
      let nearestIndex = 0;
      let nearestDistance = Math.abs(markers[0].position - clickPercent);

      for (let i = 1; i < markers.length; i++) {
        const distance = Math.abs(markers[i].position - clickPercent);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      onIndexChange(markers[nearestIndex].originalIndex);
    },
    [markers, onIndexChange]
  );

  if (changePoints.length === 0) {
    return (
      <Box p="md">
        <Text size="sm" c="dimmed" ta="center">
          No changes on this day
        </Text>
      </Box>
    );
  }

  const selectedPoint = changePoints[selectedIndex];

  return (
    <Stack gap="sm">
      {/* Header with date and change count */}
      <Group justify="space-between">
        <Text size="sm" fw={500}>{formatDateLabel(date)}</Text>
        <Text size="xs" c="dimmed">
          {changePoints.length} change{changePoints.length !== 1 ? 's' : ''}
        </Text>
      </Group>

      {/* Horizontal scrubber */}
      <Group gap="xs" wrap="nowrap" align="center">
        {/* Prev button */}
        <ActionIcon
          variant="subtle"
          size="sm"
          disabled={selectedSortedIndex <= 0}
          onClick={() => {
            if (selectedSortedIndex > 0) {
              onIndexChange(getOriginalIndex(selectedSortedIndex - 1));
            }
          }}
          aria-label="Previous change"
        >
          <Icon name="chevron-left" size={14} />
        </ActionIcon>

        {/* Timeline track */}
        <Box
          ref={trackRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={handleTrackClick}
          style={{
            flex: 1,
            position: 'relative',
            height: 40,
            cursor: 'pointer',
            outline: 'none',
          }}
          role="slider"
          aria-label={`Timeline with ${changePoints.length} changes for ${formatDateLabel(date)}`}
          aria-valuemin={0}
          aria-valuemax={changePoints.length - 1}
          aria-valuenow={selectedIndex}
          aria-valuetext={selectedPoint ? `Change at ${formatTime(selectedPoint.timestamp)}, ${selectedPoint.changeCount} operations` : undefined}
        >
          {/* Track line */}
          <Box
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: 'var(--mantine-color-gray-4)',
              borderRadius: 1,
              transform: 'translateY(-50%)',
            }}
          />

          {/* Markers */}
          {markers.map((marker) => {
            const isSelected = marker.originalIndex === selectedIndex;
            const isRevoked = marker.isFromRevokedDevice;

            return (
              <Tooltip
                key={`${marker.peerId}-${marker.frontier[0]?.counter ?? marker.sortedIndex}`}
                label={
                  <TooltipContent
                    timestamp={marker.timestamp}
                    changeCount={marker.changeCount}
                    deviceName={marker.deviceName}
                    isFromRevokedDevice={marker.isFromRevokedDevice}
                  />
                }
                withArrow
                position="top"
              >
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange(marker.originalIndex);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${marker.position}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: marker.size,
                    height: marker.size,
                    borderRadius: '50%',
                    backgroundColor: isSelected
                      ? 'var(--mantine-color-ember-5)'
                      : isRevoked
                        ? 'var(--mantine-color-red-5)'
                        : 'var(--mantine-color-gray-5)',
                    border: isSelected ? '2px solid var(--mantine-color-ember-3)' : 'none',
                    cursor: 'pointer',
                    transition: 'transform 150ms ease, background-color 150ms ease',
                    zIndex: isSelected ? 2 : 1,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%)';
                  }}
                />
              </Tooltip>
            );
          })}

          {/* Time labels */}
          {sortedChangePoints.length > 1 && (
            <>
              <Text
                size="xs"
                c="dimmed"
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: -2,
                  transform: 'translateY(100%)',
                }}
              >
                {formatTime(earliestTime)}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: -2,
                  transform: 'translateY(100%)',
                }}
              >
                {formatTime(latestTime)}
              </Text>
            </>
          )}
        </Box>

        {/* Next button */}
        <ActionIcon
          variant="subtle"
          size="sm"
          disabled={selectedSortedIndex >= sortedChangePoints.length - 1}
          onClick={() => {
            if (selectedSortedIndex < sortedChangePoints.length - 1) {
              onIndexChange(getOriginalIndex(selectedSortedIndex + 1));
            }
          }}
          aria-label="Next change"
        >
          <Icon name="chevron-right" size={14} />
        </ActionIcon>
      </Group>

      {/* Selected change details */}
      {selectedPoint && (
        <Group gap="xs" justify="center">
          <Text size="sm" fw={500}>{formatTime(selectedPoint.timestamp)}</Text>
          <Text size="xs" c="dimmed">
            {selectedPoint.changeCount} operation{selectedPoint.changeCount !== 1 ? 's' : ''}
            {selectedPoint.deviceName && ` · ${selectedPoint.deviceName}`}
            {selectedPoint.isFromRevokedDevice && (
              <Text span c="red"> (revoked)</Text>
            )}
          </Text>
        </Group>
      )}
    </Stack>
  );
}
