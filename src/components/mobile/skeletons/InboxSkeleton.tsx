import { Box, Stack, Skeleton, Group } from '@mantine/core';
import { MobileViewHeader } from '../primitives';

/**
 * Skeleton loading state for MobileInboxView.
 * Shows placeholder rows while content is loading.
 */
export function InboxSkeleton() {
  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Inbox" />

      <Box style={{ flex: 1, overflow: 'hidden' }} p="md">
        {/* Date group header skeleton */}
        <Skeleton height={12} width={60} mb="sm" />

        {/* Row skeletons */}
        <Stack gap={0}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              key={i}
              py="md"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <Group gap="sm" wrap="nowrap">
                {/* Type icon */}
                <Skeleton height={20} width={20} circle />

                {/* Content */}
                <Stack gap={6} style={{ flex: 1 }}>
                  <Skeleton height={14} width="70%" />
                  <Group gap="xs">
                    <Skeleton height={10} width={60} radius="xl" />
                    <Skeleton height={10} width={40} />
                  </Group>
                </Stack>

                {/* Chevron */}
                <Skeleton height={16} width={16} />
              </Group>
            </Box>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
