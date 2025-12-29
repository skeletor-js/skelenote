import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './SplitPane.css';

interface SplitPaneProps {
  /** Primary pane content (always visible) */
  children: ReactNode;
  /** Secondary pane content (shown when split is open) */
  secondaryContent: ReactNode | null;
  /** Width of the secondary pane as a percentage (25-75) */
  splitWidth: number;
  /** Callback when width changes from dragging */
  onWidthChange: (width: number) => void;
  /** Callback when close button is clicked */
  onClose: () => void;
}

export function SplitPane({
  children,
  secondaryContent,
  splitWidth,
  onWidthChange,
  onClose,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-close split on narrow viewports
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && secondaryContent) {
        onClose();
      }
    };

    // Check initial state
    handleChange(mediaQuery);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [secondaryContent, onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const dividerWidth = 12; // Match CSS divider width
      const minPaneWidth = 300; // Minimum pane width in pixels

      // Calculate secondary pane width (right side)
      // mouseX is where the divider is, so secondary width is containerWidth - mouseX
      let secondaryWidth = containerWidth - mouseX - dividerWidth / 2;
      let primaryWidth = mouseX - dividerWidth / 2;

      // Enforce minimum widths
      if (primaryWidth < minPaneWidth) {
        primaryWidth = minPaneWidth;
        secondaryWidth = containerWidth - primaryWidth - dividerWidth;
      } else if (secondaryWidth < minPaneWidth) {
        secondaryWidth = minPaneWidth;
        primaryWidth = containerWidth - secondaryWidth - dividerWidth;
      }

      // Convert to percentage for the secondary pane
      const widthPercent = (secondaryWidth / containerWidth) * 100;
      onWidthChange(widthPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onWidthChange]);

  // Single pane mode when no secondary content
  if (!secondaryContent) {
    return <div className="split-pane split-pane--single">{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`split-pane split-pane--split ${isDragging ? 'split-pane--dragging' : ''}`}
    >
      {/* Primary pane (left side) */}
      <div
        className="split-pane__primary"
        style={{ flex: `0 0 ${100 - splitWidth}%` }}
      >
        {children}
      </div>

      {/* Resizable divider */}
      <div
        className="split-pane__divider"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-valuenow={splitWidth}
        aria-valuemin={25}
        aria-valuemax={75}
        aria-label="Resize split pane"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onWidthChange(splitWidth - 5);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            onWidthChange(splitWidth + 5);
          }
        }}
      >
        <div className="split-pane__divider-handle" />
      </div>

      {/* Secondary pane (right side) */}
      <div
        className="split-pane__secondary"
        style={{ flex: `0 0 ${splitWidth}%` }}
      >
        <div className="split-pane__secondary-header">
          <button
            className="split-pane__close-btn"
            onClick={onClose}
            aria-label="Close split view"
          >
            ×
          </button>
        </div>
        <div className="split-pane__secondary-content">
          {secondaryContent}
        </div>
      </div>
    </div>
  );
}
