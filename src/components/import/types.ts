/**
 * Types for the Import Wizard
 */

import type { IconName } from '@/lib/icons';

/**
 * Available import sources
 */
export type ImportSource =
  | 'notion'
  | 'obsidian'
  | 'markdown'
  | 'json'
  | 'apple-notes';

/**
 * Import wizard steps
 */
export type ImportStep =
  | 'source'
  | 'files'
  | 'preview'
  | 'progress'
  | 'success';

/**
 * Configuration for an import source
 */
export interface ImportSourceConfig {
  value: ImportSource;
  label: string;
  icon: IconName;
  acceptedTypes: string;
  supportsFolder: boolean;
  instructions: {
    title: string;
    steps: string[];
  };
}

/**
 * All available import sources with their configuration
 */
export const IMPORT_SOURCES: ImportSourceConfig[] = [
  {
    value: 'notion',
    label: 'Notion',
    icon: 'globe',
    acceptedTypes: '.zip',
    supportsFolder: false,
    instructions: {
      title: 'Export from Notion',
      steps: [
        'In Notion, go to Settings & Members > Settings',
        'Scroll to Export all workspace content',
        'Choose Markdown & CSV format',
        'Upload the exported ZIP file below',
      ],
    },
  },
  {
    value: 'obsidian',
    label: 'Obsidian',
    icon: 'file-text',
    acceptedTypes: '.md',
    supportsFolder: true,
    instructions: {
      title: 'Select your vault',
      steps: [
        'Locate your Obsidian vault folder',
        'Select the folder or specific .md files',
        'Wiki-links will be converted to @mentions',
      ],
    },
  },
  {
    value: 'markdown',
    label: 'Markdown',
    icon: 'file',
    acceptedTypes: '.md,.markdown',
    supportsFolder: true,
    instructions: {
      title: 'Select Markdown files',
      steps: [
        'Select one or more .md files',
        'YAML frontmatter will be parsed as properties',
        'First H1 heading becomes the title',
      ],
    },
  },
  {
    value: 'json',
    label: 'JSON',
    icon: 'download',
    acceptedTypes: '.json',
    supportsFolder: false,
    instructions: {
      title: 'Skelenote backup',
      steps: [
        'Select a previously exported .json backup file',
        'All objects, relations, and content will be restored',
      ],
    },
  },
  {
    value: 'apple-notes',
    label: 'Apple Notes',
    icon: 'file-text',
    acceptedTypes: '.md,.html,.txt',
    supportsFolder: true,
    instructions: {
      title: 'Export from Apple Notes',
      steps: [
        'In Apple Notes, select notes to export',
        'Use File > Export as PDF or a third-party exporter',
        'Select the exported files below',
      ],
    },
  },
];

/**
 * Get source configuration by value
 */
export function getSourceConfig(source: ImportSource): ImportSourceConfig {
  const config = IMPORT_SOURCES.find((s) => s.value === source);
  if (!config) {
    throw new Error(`Unknown import source: ${source}`);
  }
  return config;
}

/**
 * Preview item representing a document to be imported
 */
export interface PreviewItem {
  id: string;
  filename: string;
  title: string;
  inferredType: string;
  properties: Record<string, unknown>;
  content: string;
  selected: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Import progress state
 */
export interface ImportProgress {
  current: number;
  total: number;
  currentDocument: string;
  phase: 'parsing' | 'importing' | 'linking' | 'complete';
  startTime: number;
}

/**
 * Import result summary
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  warnings: string[];
  objectIds: string[];
}

/**
 * Type options for manual type override in preview
 */
export const TYPE_OPTIONS = [
  { value: 'built-in:note', label: 'Note' },
  { value: 'built-in:task', label: 'Task' },
  { value: 'built-in:project', label: 'Project' },
  { value: 'built-in:area', label: 'Area' },
  { value: 'built-in:meeting', label: 'Meeting' },
] as const;
