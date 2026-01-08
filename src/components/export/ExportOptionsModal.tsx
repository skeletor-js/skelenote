/**
 * ExportOptionsModal - Modal for configuring export options
 * Supports multiple export formats with format-specific options
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  SegmentedControl,
  Checkbox,
  Box,
  Divider,
  Select,
  type ComboboxItem,
} from '@mantine/core';
import { Icon, type IconName } from '@/components/ui/Icon';
import {
  type ExportFormat,
  EXPORT_FORMATS,
  IMPLEMENTED_FORMATS,
} from '@/lib/export/types';

export interface ExportOptions {
  format: ExportFormat;
  pdfTheme: 'light' | 'dark';
  includeTitle: boolean;
  includeFrontmatter: boolean;
}

interface ExportOptionsModalProps {
  opened: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  /** Optionally restrict to specific formats */
  allowedFormats?: ExportFormat[];
}

/**
 * Custom render for format select options
 */
function FormatSelectOption({ label, icon }: { label: string; icon: string }) {
  return (
    <Group gap="xs">
      <Icon name={icon as IconName} size={14} />
      <Text size="sm">{label}</Text>
    </Group>
  );
}

export function ExportOptionsModal({
  opened,
  onClose,
  onExport,
  allowedFormats,
}: ExportOptionsModalProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [pdfTheme, setPdfTheme] = useState<'light' | 'dark'>('light');
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeFrontmatter, setIncludeFrontmatter] = useState(false);

  // Filter to only implemented formats, or allowed formats if specified
  const availableFormats = useMemo(() => {
    const implemented = EXPORT_FORMATS.filter((f) => f.implemented);
    if (allowedFormats) {
      return implemented.filter((f) => allowedFormats.includes(f.value));
    }
    return implemented;
  }, [allowedFormats]);

  // Build select data
  const formatSelectData: ComboboxItem[] = useMemo(() => {
    return availableFormats.map((f) => ({
      value: f.value,
      label: f.label,
    }));
  }, [availableFormats]);

  // Get current format info
  const currentFormat = useMemo(() => {
    return EXPORT_FORMATS.find((f) => f.value === format);
  }, [format]);

  const handleExport = useCallback(() => {
    onExport({
      format,
      pdfTheme,
      includeTitle,
      includeFrontmatter,
    });
    onClose();
  }, [format, pdfTheme, includeTitle, includeFrontmatter, onExport, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Check if format is implemented
  const isImplemented = IMPLEMENTED_FORMATS.includes(format);

  // Determine if we should show format-specific options
  const showPdfOptions = format === 'pdf';
  const showFrontmatterOption = format === 'markdown' || format === 'pdf';

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Export Options"
      centered
      size="sm"
    >
      <Stack gap="md">
        {/* Format Selection */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            Format
          </Text>
          {availableFormats.length <= 3 ? (
            // Use SegmentedControl for 2-3 formats
            <SegmentedControl
              fullWidth
              radius="sm"
              value={format}
              onChange={(value) => setFormat(value as ExportFormat)}
              data={availableFormats.map((f) => ({
                value: f.value,
                label: <FormatSelectOption label={f.label} icon={f.icon} />,
              }))}
            />
          ) : (
            // Use Select for more formats
            <Select
              value={format}
              onChange={(value) => value && setFormat(value as ExportFormat)}
              data={formatSelectData}
              leftSection={
                currentFormat && (
                  <Icon name={currentFormat.icon as IconName} size={14} />
                )
              }
              allowDeselect={false}
            />
          )}
          {currentFormat && (
            <Text size="xs" c="dimmed" mt="xs">
              {currentFormat.description}
            </Text>
          )}
        </Box>

        {/* PDF Theme (only shown when PDF is selected) */}
        {showPdfOptions && (
          <Box>
            <Text size="sm" fw={500} mb="xs">
              Theme
            </Text>
            <SegmentedControl
              fullWidth
              radius="sm"
              value={pdfTheme}
              onChange={(value) => setPdfTheme(value as 'light' | 'dark')}
              data={[
                {
                  value: 'light',
                  label: (
                    <Group gap="xs" justify="center">
                      <Icon name="sun" size={14} />
                      <Text size="sm">Light</Text>
                    </Group>
                  ),
                },
                {
                  value: 'dark',
                  label: (
                    <Group gap="xs" justify="center">
                      <Icon name="moon" size={14} />
                      <Text size="sm">Dark</Text>
                    </Group>
                  ),
                },
              ]}
            />
          </Box>
        )}

        <Divider />

        {/* Options */}
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Options
          </Text>
          <Checkbox
            label="Title"
            description="Include the object title at the top"
            checked={includeTitle}
            onChange={(e) => setIncludeTitle(e.currentTarget.checked)}
          />
          {showFrontmatterOption && (
            <Checkbox
              label="Frontmatter"
              description="Include YAML metadata (type, dates, properties)"
              checked={includeFrontmatter}
              onChange={(e) => setIncludeFrontmatter(e.currentTarget.checked)}
            />
          )}
        </Stack>

        <Divider />

        {/* Actions */}
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="filled"
            color="ember"
            onClick={handleExport}
            disabled={!isImplemented}
            leftSection={<Icon name="download" size={14} />}
          >
            Export
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
