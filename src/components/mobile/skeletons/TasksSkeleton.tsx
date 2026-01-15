import { Box, Stack, Skeleton, Group, ScrollArea } from '@mantine/core';
import { MobileViewHeader } from '../primitives';

/**
 * Skeleton loading state for MobileTasksView.
 * Shows placeholder filter tabs and task rows while loading.
 */
export function TasksSkeleton() {
  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Tasks" />

      {/* Filter tabs skeleton */}
      <Box
        px="sm"
        py="sm"
        style={{
          backgroundColor: 'var(--surface-paper)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <ScrollArea scrollbarSize={0} type="never">
          <Group gap="xs" wrap="nowrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                height={32}
                width={i === 0 ? 80 : 70}
                radius="sm"
              />
            ))}
          </Group>
        </ScrollArea>
      </Box>

      {/* Task rows skeleton */}
      <Box style={{ flex: 1, overflow: 'hidden' }} p="md">
        <Stack gap={0}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Box
              key={i}
              py="md"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                borderLeft:
                  i < 3 ? '3px solid var(--mantine-color-gray-3)' : 'none',
              }}
            >
              <Group gap="sm" wrap="nowrap">
                {/* Checkbox */}
                <Skeleton height={20} width={20} circle />

                {/* Content */}
                <Stack gap={6} style={{ flex: 1 }}>
                  <Skeleton height={14} width={`${60 + Math.random() * 30}%`} />
                  <Group gap="xs">
                    <Skeleton height={10} width={70} radius="xl" />
                    <Skeleton height={10} width={50} />
                  </Group>
                </Stack>

                {/* Priority flag */}
                {i < 3 && <Skeleton height={14} width={14} />}
              </Group>
            </Box>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
