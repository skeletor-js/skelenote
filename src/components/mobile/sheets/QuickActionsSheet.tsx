/**
 * QuickActionsSheet - Mobile command palette
 *
 * Unified actions menu accessible from FAB long-press.
 * Features:
 * - Searchable actions list
 * - Grouped by category (navigation, create, action)
 * - Navigation actions change view
 * - Create actions create and navigate to new object
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  TextInput,
  Text,
  Box,
  ScrollArea,
  UnstyledButton,
  Group,
} from '@mantine/core';
import { Search, ChevronRight } from 'lucide-react';
import { BottomSheet } from '../primitives';
import { Icon } from '@/components/ui/Icon';
import { useNavigation, useObjects } from '@/contexts';
import { useHaptics } from '@/hooks';
import {
  navigationActions,
  createActions,
  filterActions,
  type PaletteAction,
  SEARCH_ACTION_ID,
  KEYBOARD_SHORTCUTS_ACTION_ID,
  OPEN_IN_SPLIT_ACTION_ID,
  DUPLICATE_OBJECT_ACTION_ID,
  CREATE_FROM_TEMPLATE_ACTION_ID,
  NEW_TEMPLATE_ACTION_ID,
  TOGGLE_THEME_ACTION_ID,
} from '@/lib/palette/actions';
import { useMantineColorScheme } from '@mantine/core';
import type { IconName } from '@/lib/icons';

interface QuickActionsSheetProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Section header for action categories
 */
function CategoryHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      fw={600}
      tt="uppercase"
      c="dimmed"
      px="md"
      py="xs"
      style={{ letterSpacing: 0.5 }}
    >
      {children}
    </Text>
  );
}

/**
 * Individual action item
 */
function ActionItem({
  action,
  onPress,
}: {
  action: PaletteAction;
  onPress: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onPress}
      style={{
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Icon
          name={action.icon as IconName}
          size={20}
          style={{ color: 'var(--mantine-color-gray-6)', flexShrink: 0 }}
        />
        <Text size="sm" style={{ flex: 1 }}>
          {action.label}
        </Text>
        <ChevronRight
          size={16}
          style={{ color: 'var(--mantine-color-gray-4)', flexShrink: 0 }}
        />
      </Group>
    </UnstyledButton>
  );
}

/**
 * QuickActionsSheet - Mobile command palette
 */
export function QuickActionsSheet({ opened, onClose }: QuickActionsSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { navigateToView, navigateToObject, navigateToSearch } =
    useNavigation();
  const { store, refreshData } = useObjects();
  const haptics = useHaptics();
  const { toggleColorScheme } = useMantineColorScheme();

  // Filter out actions that don't make sense on mobile
  const mobileActions = useMemo(() => {
    const excludedIds = [
      KEYBOARD_SHORTCUTS_ACTION_ID, // No keyboard on mobile
      OPEN_IN_SPLIT_ACTION_ID, // No split view on mobile
      DUPLICATE_OBJECT_ACTION_ID, // Context-dependent
      CREATE_FROM_TEMPLATE_ACTION_ID, // Could be added later
      NEW_TEMPLATE_ACTION_ID, // Could be added later
    ];

    return [...navigationActions, ...createActions].filter(
      (action) => !excludedIds.includes(action.id)
    );
  }, []);

  // Filter actions by search query
  const filteredActions = useMemo(() => {
    return filterActions(mobileActions, searchQuery);
  }, [mobileActions, searchQuery]);

  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, PaletteAction[]> = {
      navigation: [],
      create: [],
      action: [],
    };

    filteredActions.forEach((action) => {
      const category =
        action.category === 'object' ? 'action' : action.category;
      if (groups[category]) {
        groups[category].push(action);
      }
    });

    return groups;
  }, [filteredActions]);

  // Handle action selection
  const handleAction = useCallback(
    (action: PaletteAction) => {
      haptics.impact('light');

      // Special action handlers
      if (action.id === SEARCH_ACTION_ID) {
        navigateToSearch();
        onClose();
        return;
      }

      if (action.id === TOGGLE_THEME_ACTION_ID) {
        toggleColorScheme();
        onClose();
        return;
      }

      // Navigation actions
      if (action.view) {
        navigateToView(action.view);
        onClose();
        return;
      }

      // Create actions
      if (action.typeId && store) {
        const newObj = store.create({
          typeId: action.typeId,
          properties: {},
        });
        refreshData();
        navigateToObject(newObj.id);
        onClose();
        return;
      }

      // Custom action handler
      if (action.action) {
        action.action();
        onClose();
      }
    },
    [
      haptics,
      navigateToView,
      navigateToObject,
      navigateToSearch,
      store,
      refreshData,
      onClose,
      toggleColorScheme,
    ]
  );

  // Clear search on close
  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const categoryLabels: Record<string, string> = {
    action: 'Actions',
    navigation: 'Navigate',
    create: 'Create New',
  };

  return (
    <BottomSheet
      opened={opened}
      onClose={handleClose}
      title="Quick Actions"
      size="lg"
    >
      <Stack gap={0}>
        {/* Search input */}
        <Box px="md" pb="sm">
          <TextInput
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftSection={<Search size={16} />}
            autoFocus
          />
        </Box>

        {/* Actions list */}
        <ScrollArea style={{ maxHeight: '50vh' }}>
          {['action', 'navigation', 'create'].map((category) => {
            const actions = groupedActions[category];
            if (!actions || actions.length === 0) return null;

            return (
              <Box key={category}>
                <CategoryHeader>{categoryLabels[category]}</CategoryHeader>
                {actions.map((action) => (
                  <ActionItem
                    key={action.id}
                    action={action}
                    onPress={() => handleAction(action)}
                  />
                ))}
              </Box>
            );
          })}

          {/* Empty state */}
          {filteredActions.length === 0 && (
            <Box py="xl" ta="center">
              <Text size="sm" c="dimmed">
                No actions match "{searchQuery}"
              </Text>
            </Box>
          )}
        </ScrollArea>
      </Stack>
    </BottomSheet>
  );
}
