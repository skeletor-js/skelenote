/**
 * TimelineSlider - Horizontal timeline scrubber for navigating changes within a day
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { TimelineSliderProps } from './types';
import './TimelineSlider.css';

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

export function TimelineSlider({
  date,
  changePoints,
  selectedIndex,
  onIndexChange,
}: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Get time bounds for the day
  const { minTime, timeRange } = useMemo(() => {
    if (changePoints.length === 0) {
      return { minTime: 0, timeRange: 0 };
    }

    // Use midnight to midnight for the day
    const dayStart = new Date(date + 'T00:00:00').getTime();
    const dayEnd = new Date(date + 'T23:59:59.999').getTime();

    return {
      minTime: dayStart,
      timeRange: dayEnd - dayStart,
    };
  }, [date, changePoints.length]);

  // Calculate position (0-100%) for a timestamp
  const getPositionForTime = useCallback(
    (timestamp: number): number => {
      if (timeRange === 0) return 50;
      const position = ((timestamp - minTime) / timeRange) * 100;
      // Clamp to 2-98% to keep markers visible
      return Math.max(2, Math.min(98, position));
    },
    [minTime, timeRange]
  );

  // Handle track click to select nearest change point
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || changePoints.length === 0) return;

      const rect = trackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const targetTime = minTime + percentage * timeRange;

      // Find closest change point
      let closestIndex = 0;
      let closestDistance = Infinity;

      changePoints.forEach((cp, index) => {
        const distance = Math.abs(cp.timestamp - targetTime);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      onIndexChange(closestIndex);
    },
    [changePoints, minTime, timeRange, onIndexChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        e.preventDefault();
        onIndexChange(selectedIndex - 1);
      } else if (e.key === 'ArrowRight' && selectedIndex < changePoints.length - 1) {
        e.preventDefault();
        onIndexChange(selectedIndex + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        onIndexChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onIndexChange(changePoints.length - 1);
      }
    },
    [selectedIndex, changePoints.length, onIndexChange]
  );

  const selectedPoint = changePoints[selectedIndex];
  const hoveredPoint = hoveredIndex !== null ? changePoints[hoveredIndex] : null;

  // Time labels at intervals
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let hour = 0; hour <= 24; hour += 6) {
      const label =
        hour === 0
          ? '12am'
          : hour === 12
            ? '12pm'
            : hour === 24
              ? '12am'
              : hour < 12
                ? `${hour}am`
                : `${hour - 12}pm`;
      labels.push({ hour, label, position: (hour / 24) * 100 });
    }
    return labels;
  }, []);

  if (changePoints.length === 0) {
    return (
      <div className="tm-timeline tm-timeline--empty">
        <p className="tm-timeline__empty-message">No changes on this day</p>
      </div>
    );
  }

  return (
    <div className="tm-timeline">
      {/* Header with date and change count */}
      <div className="tm-timeline__header">
        <span className="tm-timeline__date">{formatDateLabel(date)}</span>
        <span className="tm-timeline__count">
          {changePoints.length} change{changePoints.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="tm-timeline__track"
        onClick={handleTrackClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={changePoints.length - 1}
        aria-valuenow={selectedIndex}
        aria-valuetext={selectedPoint ? formatTime(selectedPoint.timestamp) : undefined}
        aria-label={`Timeline with ${changePoints.length} changes`}
      >
        {/* Time labels */}
        <div className="tm-timeline__labels">
          {timeLabels.map(({ hour, label, position }) => (
            <span
              key={hour}
              className="tm-timeline__label"
              style={{ left: `${position}%` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Track line */}
        <div className="tm-timeline__line" />

        {/* Change point markers */}
        {changePoints.map((point, index) => {
          const position = getPositionForTime(point.timestamp);
          const isSelected = index === selectedIndex;

          const className = [
            'tm-timeline__marker',
            isSelected ? 'tm-timeline__marker--selected' : '',
            point.isFromRevokedDevice ? 'tm-timeline__marker--revoked' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={`${point.peerId}-${point.frontier[0]?.counter ?? index}`}
              className={className}
              style={{ left: `${position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange(index);
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
              tabIndex={-1}
              aria-label={`Change at ${formatTime(point.timestamp)}${
                point.deviceName ? ` by ${point.deviceName}` : ''
              }, ${point.changeCount} operation${point.changeCount !== 1 ? 's' : ''}`}
            />
          );
        })}

        {/* Tooltip for hovered/focused marker */}
        {hoveredPoint && hoveredIndex !== null && (
          <div
            className="tm-timeline__tooltip"
            style={{ left: `${getPositionForTime(hoveredPoint.timestamp)}%` }}
            role="tooltip"
          >
            <span className="tm-timeline__tooltip-time">
              {formatTime(hoveredPoint.timestamp)}
            </span>
            {hoveredPoint.deviceName && (
              <span className="tm-timeline__tooltip-device">
                {hoveredPoint.deviceName}
              </span>
            )}
            <span className="tm-timeline__tooltip-count">
              {hoveredPoint.changeCount} operation
              {hoveredPoint.changeCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Selected time display */}
      {selectedPoint && (
        <div className="tm-timeline__selected">
          <span className="tm-timeline__selected-label">Viewing:</span>
          <span className="tm-timeline__selected-time">
            {formatTime(selectedPoint.timestamp)}
          </span>
          {selectedPoint.deviceName && (
            <span className="tm-timeline__selected-device">
              ({selectedPoint.deviceName})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
