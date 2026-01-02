/**
 * KeyboardShortcutsModal - Modal displaying all keyboard shortcuts
 * Triggered by Cmd+? or via Command Palette
 */

import { Modal, ScrollArea, Stack, Group, Text, Kbd, Divider } from '@mantine/core';
import { ShortcutCategory } from './ShortcutCategory';
import { getShortcutsByCategory, type ShortcutCategory as CategoryType } from '@/lib/shortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Get shortcuts grouped by category
  const shortcutsByCategory = getShortcutsByCategory();

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      centered
      size="lg"
    >
      <Stack gap="md">
        <ScrollArea.Autosize mah={400}>
          <Stack gap="lg">
            {Array.from(shortcutsByCategory.entries()).map(([category, shortcuts], index) => (
              <div key={category}>
                {index > 0 && <Divider mb="md" />}
                <ShortcutCategory
                  category={category as CategoryType}
                  shortcuts={shortcuts}
                />
              </div>
            ))}
          </Stack>
        </ScrollArea.Autosize>

        <Divider />

        <Group justify="center" gap="xs">
          <Text size="sm" c="dimmed">Press</Text>
          <Kbd size="xs">Esc</Kbd>
          <Text size="sm" c="dimmed">or</Text>
          <Kbd size="xs">Cmd</Kbd>
          <Text size="sm" c="dimmed">+</Text>
          <Kbd size="xs">?</Kbd>
          <Text size="sm" c="dimmed">to close</Text>
        </Group>
      </Stack>
    </Modal>
  );
}
