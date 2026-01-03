/**
 * DailyNoteHeader - Journal-style date header for Daily Notes view
 * Displays date prominently without visual separation from editor
 */

import { Group, Text, ActionIcon, Menu } from '@mantine/core';
import { MoreHorizontal } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import styles from './DailyNoteHeader.module.css';

interface DailyNoteHeaderProps {
  /** The date to display */
  date: Date;
  /** Callback for viewing object history */
  onViewHistory?: () => void;
  /** Callback for exporting to markdown */
  onExport?: () => void;
  /** Callback for deleting the daily note */
  onDelete?: () => void;
}

/**
 * Format date as journal-style: "Thursday, January 2"
 */
function formatJournalDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if the date is in the current year
 */
function isCurrentYear(date: Date): boolean {
  return date.getFullYear() === new Date().getFullYear();
}

export function DailyNoteHeader({
  date,
  onViewHistory,
  onExport,
  onDelete,
}: DailyNoteHeaderProps) {
  const dateLabel = formatJournalDate(date);
  const showYear = !isCurrentYear(date);

  return (
    <Group
      component="header"
      justify="space-between"
      wrap="nowrap"
      className={styles.header}
    >
      <div>
        <Text size="xl" fw={600} className={styles.dateTitle}>
          {dateLabel}
        </Text>
        {showYear && (
          <Text size="sm" c="dimmed" className={styles.yearSubtitle}>
            {date.getFullYear()}
          </Text>
        )}
      </div>

      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label="More actions"
            className={styles.menuTrigger}
          >
            <MoreHorizontal size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {onViewHistory && (
            <Menu.Item
              leftSection={<Icon name="history" size={14} />}
              onClick={onViewHistory}
            >
              View history
            </Menu.Item>
          )}
          {onExport && (
            <Menu.Item
              leftSection={<Icon name="download" size={14} />}
              onClick={onExport}
              rightSection={
                <Text size="xs" c="dimmed">
                  Cmd+Shift+E
                </Text>
              }
            >
              Export to Markdown
            </Menu.Item>
          )}
          {(onViewHistory || onExport) && onDelete && <Menu.Divider />}
          {onDelete && (
            <Menu.Item
              color="brick"
              leftSection={<Icon name="trash-2" size={14} />}
              onClick={onDelete}
            >
              Delete note
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
