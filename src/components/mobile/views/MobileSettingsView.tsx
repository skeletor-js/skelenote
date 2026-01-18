/**
 * Mobile-optimized Settings View
 * Features: full-screen settings with grouped sections
 */

import { useState, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { Stack, Box, Text, UnstyledButton, Switch } from '@mantine/core';
import {
  ChevronRight,
  Key,
  RefreshCw,
  Moon,
  Sun,
  Download,
  Upload,
  AlertTriangle,
  Info,
  HelpCircle,
  Fingerprint,
  Search,
  Sliders,
  FileText,
} from 'lucide-react';
import { useMantineColorScheme } from '@mantine/core';
import { MobileViewHeader } from '../primitives';
import {
  SyncSettingsSheet,
  AccountSettingsSheet,
  DataSettingsSheet,
  DangerZoneSheet,
  SearchSettingsSheet,
  AppearanceSettingsSheet,
  TemplateSettingsSheet,
  ImportSheet,
  DeviceManagerSheet,
} from '../sheets';
import { useBiometric } from '@/hooks';
import {
  useSkeletonKey,
  useSyncContext,
  useLocalSync,
  useObjects,
  useTypeRegistry,
  useToast,
  useSemanticSearchSafe,
} from '@/contexts';
import {
  getSyncServerUrl,
  setSyncServerUrl,
  getUserId,
  getDeviceId,
} from '@/lib/sync';
import { exportAllToZip, exportAllToJSON } from '@/lib/export';

interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  rightSection?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({
  icon: Icon,
  label,
  value,
  onClick,
  rightSection,
  danger,
}: SettingRowProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px',
        width: '100%',
      }}
    >
      <Icon
        size={20}
        style={{
          color: danger
            ? 'var(--mantine-color-brick-5)'
            : 'var(--mantine-color-gray-6)',
          flexShrink: 0,
        }}
      />
      <Text size="sm" style={{ flex: 1 }} c={danger ? 'brick' : undefined}>
        {label}
      </Text>
      {value && (
        <Text size="sm" c="dimmed">
          {value}
        </Text>
      )}
      {rightSection}
      {onClick && !rightSection && (
        <ChevronRight
          size={16}
          style={{ color: 'var(--mantine-color-gray-4)' }}
        />
      )}
    </UnstyledButton>
  );
}

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Text size="xs" fw={500} c="dimmed" tt="uppercase" px="md" py="sm">
        {title}
      </Text>
      <Box
        style={{
          backgroundColor: 'var(--surface-paper)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// Map context status to sheet connection status
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

function mapSyncStatus(status: string, hasError: boolean): ConnectionStatus {
  if (hasError) return 'error';
  switch (status) {
    case 'connected':
      return 'connected';
    case 'connecting':
      return 'connecting';
    case 'syncing':
      return 'connected';
    default:
      return 'disconnected';
  }
}

function mapLocalSyncStatus(
  status: string,
  connectedCount: number
): ConnectionStatus {
  if (connectedCount > 0) return 'connected';
  switch (status) {
    case 'starting':
      return 'connecting';
    case 'discovering':
      return 'disconnected'; // Ready but not connected
    case 'connected':
      return 'connected';
    case 'error':
      return 'error';
    default:
      return 'disconnected';
  }
}

export function MobileSettingsView() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { isAvailable: biometricAvailable, biometryName } = useBiometric();
  const { biometricEnabled, setBiometricEnabled, hasSkeletonKey, resetVault } =
    useSkeletonKey();
  const syncContext = useSyncContext();
  const localSync = useLocalSync();
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  const semanticSearch = useSemanticSearchSafe();

  // Sheet open states
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [dataSheetOpen, setDataSheetOpen] = useState(false);
  const [dangerZoneSheetOpen, setDangerZoneSheetOpen] = useState(false);
  const [searchSettingsOpen, setSearchSettingsOpen] = useState(false);
  const [appearanceSheetOpen, setAppearanceSheetOpen] = useState(false);
  const [templateSettingsOpen, setTemplateSettingsOpen] = useState(false);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [deviceManagerOpen, setDeviceManagerOpen] = useState(false);

  // Cloud sync state
  const [cloudRelayUrl, setCloudRelayUrl] = useState(
    () => getSyncServerUrl() || ''
  );

  // Computed sync status text
  const getSyncStatusText = useCallback(() => {
    const cloudConnected = syncContext.isConnected;
    const localConnected = localSync.connectedPeerCount > 0;

    if (cloudConnected && localConnected) {
      return 'Cloud + Local';
    } else if (cloudConnected) {
      return 'Cloud';
    } else if (localConnected) {
      return `${localSync.connectedPeerCount} device${localSync.connectedPeerCount !== 1 ? 's' : ''}`;
    } else if (localSync.isEnabled || syncContext.syncClient) {
      return 'Ready';
    }
    return 'Off';
  }, [syncContext, localSync]);

  // Sync settings handlers
  const handleCloudEnabledChange = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const url = cloudRelayUrl || getSyncServerUrl();
        if (url) {
          const userId = getUserId();
          const deviceId = getDeviceId();
          syncContext.connect(url, userId, deviceId);
        }
      } else {
        syncContext.disconnect();
      }
    },
    [cloudRelayUrl, syncContext]
  );

  const handleCloudRelayUrlChange = useCallback(
    (url: string) => {
      setCloudRelayUrl(url);
      setSyncServerUrl(url);
      // Reconnect with new URL if currently connected
      if (syncContext.isConnected) {
        const userId = getUserId();
        const deviceId = getDeviceId();
        syncContext.connect(url, userId, deviceId);
      }
    },
    [syncContext]
  );

  const handleLocalSyncEnabledChange = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await localSync.enable();
      } else {
        await localSync.disable();
      }
    },
    [localSync]
  );

  // Account settings handlers
  const handleRevealMnemonic = useCallback(async (): Promise<
    string[] | null
  > => {
    // The mnemonic is not stored for security reasons - only the derived master key is stored.
    // Users must write down their mnemonic during initial setup.
    // Return null to indicate mnemonic cannot be retrieved.
    addToast({
      type: 'info',
      message:
        'For security, your Skeleton Key is not stored. Please refer to your written backup.',
      duration: 5000,
    });
    return null;
  }, [addToast]);

  // Data settings handlers
  const handleExport = useCallback(
    async (format: 'json' | 'markdown') => {
      if (!store || !typeRegistry) {
        throw new Error('Store not initialized');
      }

      const objects = store.getAll({ includeArchived: false });

      // Create content getter
      const getContent = (objectId: string): string => {
        try {
          return store.getContent(objectId);
        } catch {
          return '';
        }
      };

      let filePath: string | null = null;

      if (format === 'json') {
        // JSON export - complete backup format
        filePath = await exportAllToJSON(objects, getContent);
      } else {
        // Markdown export - human-readable format
        // Create resolver function for object names (only needed for markdown)
        const resolveObjectName = (id: string): string | undefined => {
          const obj = store.get(id);
          if (!obj) return undefined;
          const name = obj.properties.title ?? obj.properties.name;
          return name ? String(name) : undefined;
        };

        filePath = await exportAllToZip(
          objects,
          typeRegistry,
          getContent,
          resolveObjectName,
          { organizeByType: true }
        );
      }

      if (filePath) {
        addToast({
          type: 'success',
          message: `Exported ${objects.length} objects`,
        });
      }
    },
    [store, typeRegistry, addToast]
  );

  const handleImport = useCallback(async () => {
    setImportSheetOpen(true);
  }, []);

  // Danger zone handlers
  const handleResetVault = useCallback(async () => {
    await resetVault();
    addToast({
      type: 'success',
      message: 'Vault has been reset',
    });
  }, [resetVault, addToast]);

  // Get device info for account sheet
  const userId = getUserId();
  const deviceId = getDeviceId();
  const deviceFingerprint = localSync.deviceInfo?.fingerprint || '';

  return (
    <Stack gap={0} h="100%">
      <MobileViewHeader title="Settings" showBack />

      <Box
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--surface-canvas)',
        }}
      >
        <Stack gap="md" py="md">
          {/* Security Section - only show if biometric is available */}
          {biometricAvailable && (
            <SettingSection title="Security">
              <SettingRow
                icon={Fingerprint}
                label={`Require ${biometryName}`}
                rightSection={
                  <Switch
                    checked={biometricEnabled}
                    onChange={(e) =>
                      setBiometricEnabled(e.currentTarget.checked)
                    }
                    size="md"
                  />
                }
              />
            </SettingSection>
          )}

          {/* Account Section */}
          <SettingSection title="Account">
            <SettingRow
              icon={Key}
              label="Skeleton Key"
              onClick={() => setAccountSheetOpen(true)}
            />
            <Box style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <SettingRow
                icon={RefreshCw}
                label="Sync"
                value={getSyncStatusText()}
                onClick={() => setSyncSheetOpen(true)}
              />
            </Box>
          </SettingSection>

          {/* Appearance Section */}
          <SettingSection title="Appearance">
            <SettingRow
              icon={isDark ? Moon : Sun}
              label="Dark Mode"
              rightSection={
                <Switch
                  checked={isDark}
                  onChange={() => toggleColorScheme()}
                  size="md"
                />
              }
            />
            <Box style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <SettingRow
                icon={Sliders}
                label="More Options"
                onClick={() => setAppearanceSheetOpen(true)}
              />
            </Box>
          </SettingSection>

          {/* Search Section */}
          <SettingSection title="Search">
            <SettingRow
              icon={Search}
              label="Lantern"
              value={
                semanticSearch?.isEnabled
                  ? semanticSearch?.status === 'ready'
                    ? 'Active'
                    : 'Loading'
                  : 'Off'
              }
              onClick={() => setSearchSettingsOpen(true)}
            />
          </SettingSection>

          {/* Templates Section */}
          <SettingSection title="Templates">
            <SettingRow
              icon={FileText}
              label="Manage Templates"
              onClick={() => setTemplateSettingsOpen(true)}
            />
          </SettingSection>

          {/* Data Section */}
          <SettingSection title="Data">
            <SettingRow
              icon={Download}
              label="Export Data"
              onClick={() => setDataSheetOpen(true)}
            />
            <Box style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <SettingRow
                icon={Upload}
                label="Import"
                onClick={() => setDataSheetOpen(true)}
              />
            </Box>
            <Box style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <SettingRow
                icon={AlertTriangle}
                label="Danger Zone"
                danger
                onClick={() => setDangerZoneSheetOpen(true)}
              />
            </Box>
          </SettingSection>

          {/* About Section */}
          <SettingSection title="About">
            <SettingRow icon={Info} label="Version" value="0.2.0-alpha" />
            <Box style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <SettingRow
                icon={HelpCircle}
                label="Help & Support"
                onClick={() => {
                  open('https://github.com/skeletor-js/skelenote/issues');
                }}
              />
            </Box>
          </SettingSection>

          {/* Footer */}
          <Box px="md" py="lg">
            <Text size="xs" c="dimmed" ta="center">
              Made with care for your notes
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Settings Sheets */}
      <SyncSettingsSheet
        opened={syncSheetOpen}
        onClose={() => setSyncSheetOpen(false)}
        cloudEnabled={syncContext.syncClient !== null}
        cloudRelayUrl={cloudRelayUrl}
        cloudStatus={mapSyncStatus(syncContext.status, syncContext.hasError)}
        onCloudEnabledChange={handleCloudEnabledChange}
        onCloudRelayUrlChange={handleCloudRelayUrlChange}
        onReconnect={syncContext.reconnect}
        localSyncEnabled={localSync.isEnabled}
        localSyncStatus={mapLocalSyncStatus(
          localSync.status,
          localSync.connectedPeerCount
        )}
        localPeersCount={localSync.connectedPeerCount}
        onLocalSyncEnabledChange={handleLocalSyncEnabledChange}
        onOpenDeviceManager={() => {
          setDeviceManagerOpen(true);
        }}
      />

      <AccountSettingsSheet
        opened={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        userId={userId}
        deviceId={deviceId}
        deviceFingerprint={deviceFingerprint}
        onRevealMnemonic={handleRevealMnemonic}
        isEncrypted={hasSkeletonKey}
      />

      <DataSettingsSheet
        opened={dataSheetOpen}
        onClose={() => setDataSheetOpen(false)}
        onExport={handleExport}
        onImport={handleImport}
      />

      <DangerZoneSheet
        opened={dangerZoneSheetOpen}
        onClose={() => setDangerZoneSheetOpen(false)}
        onResetVault={handleResetVault}
      />

      <SearchSettingsSheet
        opened={searchSettingsOpen}
        onClose={() => setSearchSettingsOpen(false)}
      />

      <AppearanceSettingsSheet
        opened={appearanceSheetOpen}
        onClose={() => setAppearanceSheetOpen(false)}
      />

      <TemplateSettingsSheet
        opened={templateSettingsOpen}
        onClose={() => setTemplateSettingsOpen(false)}
      />

      <ImportSheet
        opened={importSheetOpen}
        onClose={() => setImportSheetOpen(false)}
      />

      <DeviceManagerSheet
        opened={deviceManagerOpen}
        onClose={() => setDeviceManagerOpen(false)}
      />
    </Stack>
  );
}
