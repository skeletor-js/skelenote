import { Box, Stack, Skeleton, Group } from '@mantine/core';
import { MobileViewHeader } from '../primitives';

/**
 * Skeleton loading state for MobileDailyNotesView.
 * Shows placeholder week strip and content area while loading.
 */
export function DailyNotesSkeleton() {
  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Daily Notes" />

      {/* Week strip skeleton */}
      <Box
        style={{
          backgroundColor: 'var(--surface-paper)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {/* Week label */}
        <Group justify="space-between" px="md" py="xs">
          <Skeleton height={16} width={16} />
          <Skeleton height={12} width={100} />
          <Skeleton height={16} width={16} />
        </Group>

        {/* Day cells */}
        <Group gap={0} px="sm" pb="sm" justify="space-around">
          {Array.from({ length: 7 }).map((_, i) => (
            <Box key={i} style={{ textAlign: 'center' }}>
              <Skeleton height={10} width={14} mb={4} mx="auto" />
              <Skeleton height={44} width={44} radius={8} />
            </Box>
          ))}
        </Group>
      </Box>

      {/* Content skeleton */}
      <Box style={{ flex: 1, overflow: 'hidden' }} p="md">
        <Stack gap="md">
          {/* Date title */}
          <Box>
            <Skeleton height={20} width={180} mb={4} />
            <Skeleton height={12} width={40} />
          </Box>

          {/* Editor area */}
          <Stack gap="sm">
            <Skeleton height={16} width="90%" />
            <Skeleton height={16} width="75%" />
            <Skeleton height={16} width="85%" />
            <Skeleton height={16} width="60%" />
            <Skeleton height={16} width="70%" />
          </Stack>

          {/* Backlinks section */}
          <Box pt="md">
            <Group gap="xs" mb="sm">
              <Skeleton height={14} width={14} />
              <Skeleton height={12} width={80} />
              <Skeleton height={16} width={24} radius="xl" />
            </Group>
          </Box>

          {/* Tasks section */}
          <Box>
            <Group gap="xs" mb="sm">
              <Skeleton height={14} width={14} />
              <Skeleton height={12} width={70} />
              <Skeleton height={16} width={24} radius="xl" />
            </Group>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
