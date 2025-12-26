/**
 * InboxRow component for inbox list view display
 * Shows: type icon, title/name, type label, created date, preview (first tag), process button
 */

import { useCallback } from 'react';
import type { EphemeraObject } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils/date';
import { useObjects, useTypeRegistry } from '@/contexts';
import { Tag, type TagColor } from '@/components/ui';
import './InboxRow.css';

interface InboxRowProps {
  /** The inbox item object to display */
  item: EphemeraObject;
  /** Callback when row is clicked (navigates to detail) */
  onClick: () => void;
  /** Callback when process button is clicked */
  onProcess: (itemId: string) => void;
}

export function InboxRow({ item, onClick, onProcess }: InboxRowProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();

  // Get type info
  const typeDef = typeRegistry.get(item.typeId);
  const icon = typeDef?.icon ?? '📄';
  const typeName = typeDef?.name ?? item.typeId;

  // Get title or name
  const title = (item.properties.title ?? item.properties.name ?? 'Untitled') as string;

  // Get first tag for preview
  const tagIds = item.properties.tags as string[] | null;
  const firstTag = tagIds?.[0] ? store?.get(tagIds[0]) : null;
  const tagInfo = firstTag
    ? {
        name: firstTag.properties.name as string,
        color: firstTag.properties.color as TagColor | undefined,
      }
    : null;

  // Handle process button click without triggering row click
  const handleProcessClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onProcess(item.id);
    },
    [onProcess, item.id]
  );

  // Handle keyboard on process button
  const handleProcessKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onProcess(item.id);
      }
    },
    [onProcess, item.id]
  );

  return (
    <div
      className="inbox-row"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          onClick();
        }
      }}
    >
      {/* Type icon */}
      <span className="inbox-row__icon" title={typeName}>
        {icon}
      </span>

      {/* Title */}
      <span className="inbox-row__title">{title}</span>

      {/* Type label */}
      <span className="inbox-row__type">{typeName}</span>

      {/* Created date */}
      <span className="inbox-row__date">{formatRelativeDate(item.createdAt)}</span>

      {/* Preview - first tag */}
      {tagInfo && (
        <div className="inbox-row__preview">
          <Tag name={tagInfo.name} color={tagInfo.color} size="sm" />
        </div>
      )}

      {/* Process button */}
      <button
        className="inbox-row__process"
        onClick={handleProcessClick}
        onKeyDown={handleProcessKeyDown}
        aria-label="Mark as processed"
        title="Process"
      >
        Done
      </button>
    </div>
  );
}
