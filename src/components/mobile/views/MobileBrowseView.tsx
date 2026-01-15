import { useMemo } from 'react';
import { Stack, Text, Box, ScrollArea } from '@mantine/core';
import {
  Folder,
  Layers,
  Tag,
  Bookmark,
  Archive,
  Clock,
  Grid3X3,
  Settings,
  FileText,
} from 'lucide-react';
import { MobileViewHeader, BrowseItem } from '../primitives';
import { useNavigation, useObjects } from '@/contexts';
import { useArchive, useSavedViews, useTemplates } from '@/hooks';
import { BuiltInTypeIds } from '@/lib/types';

/**
 * Section header for grouping browse items
 */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Box
      px="md"
      py="xs"
      style={{
        backgroundColor: 'var(--surface-muted)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <Text
        size="xs"
        fw={600}
        tt="uppercase"
        style={{ color: 'var(--mantine-color-gray-6)', letterSpacing: 0.5 }}
      >
        {children}
      </Text>
    </Box>
  );
}

/**
 * Mobile Browse View - Hub for organizational and advanced features
 *
 * Provides access to:
 * - Organization: Projects, Areas, Tags, Saved Views
 * - History & Archive: Archive, Time Machine
 * - Advanced: Browse Types, Settings
 */
export function MobileBrowseView() {
  const { navigateToView } = useNavigation();
  const { store, dataVersion } = useObjects();
  const { count: archiveCount } = useArchive();
  const { count: savedViewsCount } = useSavedViews();
  const { templates } = useTemplates();

  // Get counts for organizational items
  const counts = useMemo(() => {
    if (!store) {
      return { projects: 0, areas: 0, tags: 0, templates: 0 };
    }

    const allObjects = store.getAll();

    return {
      projects: allObjects.filter(
        (obj) =>
          obj.typeId === BuiltInTypeIds.PROJECT &&
          obj.properties.status !== 'archived'
      ).length,
      areas: allObjects.filter((obj) => obj.typeId === BuiltInTypeIds.AREA)
        .length,
      tags: allObjects.filter((obj) => obj.typeId === BuiltInTypeIds.TAG)
        .length,
      templates: templates.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataVersion, templates.length]);

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Browse" />

      <ScrollArea style={{ flex: 1 }}>
        {/* Organization Section */}
        <SectionHeader>Organization</SectionHeader>
        <BrowseItem
          icon={Folder}
          label="Projects"
          count={counts.projects}
          onPress={() => navigateToView('projects')}
        />
        <BrowseItem
          icon={Layers}
          label="Areas"
          count={counts.areas}
          onPress={() => navigateToView('areas')}
        />
        <BrowseItem
          icon={Tag}
          label="Tags"
          count={counts.tags}
          onPress={() => navigateToView('tags')}
        />
        <BrowseItem
          icon={Bookmark}
          label="Saved Views"
          count={savedViewsCount}
          onPress={() => navigateToView('saved-view')}
        />

        {/* History & Archive Section */}
        <SectionHeader>History & Archive</SectionHeader>
        <BrowseItem
          icon={Archive}
          label="Archive"
          count={archiveCount}
          onPress={() => navigateToView('archive')}
        />
        <BrowseItem
          icon={Clock}
          label="Time Machine"
          onPress={() => navigateToView('time-machine')}
        />

        {/* Advanced Section */}
        <SectionHeader>Advanced</SectionHeader>
        <BrowseItem
          icon={FileText}
          label="Templates"
          count={counts.templates}
          onPress={() => navigateToView('templates')}
        />
        <BrowseItem
          icon={Grid3X3}
          label="Browse Types"
          onPress={() => navigateToView('type-browse')}
        />
        <BrowseItem
          icon={Settings}
          label="Settings"
          onPress={() => navigateToView('settings')}
        />
      </ScrollArea>
    </Stack>
  );
}
