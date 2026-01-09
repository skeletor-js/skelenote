/**
 * Types for the Import Wizard
 */

import type { IconName } from '@/lib/icons';
import { BuiltInTypeIds } from '@/lib/types';

/**
 * Available import sources
 */
export type ImportSource = 'notion' | 'obsidian' | 'markdown';

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
    acceptedTypes: '', // Uses API, not file upload
    supportsFolder: false,
    instructions: {
      title: 'Connect to Notion',
      steps: [
        'Create an integration at notion.so/my-integrations',
        'Share databases with your integration',
        'Paste your integration token',
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
  { value: BuiltInTypeIds.TASK, label: 'Task' },
  { value: BuiltInTypeIds.NOTE, label: 'Note' },
  { value: BuiltInTypeIds.PROJECT, label: 'Project' },
  { value: BuiltInTypeIds.AREA, label: 'Area' },
  { value: BuiltInTypeIds.MEETING, label: 'Meeting' },
  { value: BuiltInTypeIds.LINK, label: 'Link' },
  { value: BuiltInTypeIds.PERSON, label: 'Person' },
  { value: BuiltInTypeIds.TAG, label: 'Tag' },
];
