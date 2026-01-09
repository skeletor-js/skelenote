/**
 * Import Wizard
 *
 * Multi-step wizard for importing documents from various sources.
 * Lives inside the DataSettings panel.
 *
 * Supports two flows:
 * 1. File-based: Markdown, Obsidian, JSON backup, Apple Notes
 * 2. API-based: Notion (connects via API token)
 */

import { useState, useCallback } from 'react';
import { Box } from '@mantine/core';
import { useObjects, useToast } from '@/contexts';
import { importMarkdown } from '@/lib/import';
import { BuiltInTypeIds, generateId } from '@/lib/types';
import type { NotionClient } from '@/lib/import/notion-api';
import type {
  SelectedDatabase,
  NotionImportProgress,
} from '@/lib/import/notion-import';
import { ImportSourceSelector } from './ImportSourceSelector';
import { ImportFilePicker } from './ImportFilePicker';
import { ImportPreview } from './ImportPreview';
import { ImportProgressView } from './ImportProgressView';
import { ImportSuccess } from './ImportSuccess';
import { NotionConnect } from './NotionConnect';
import { NotionDatabasePicker } from './NotionDatabasePicker';
import { NotionTypeMapper } from './NotionTypeMapper';
import {
  StandalonePageOptions,
  type StandaloneImportOption,
} from './StandalonePageOptions';
import type {
  ImportSource,
  ImportStep,
  PreviewItem,
  ImportProgress,
  ImportResult,
} from './types';
import classes from './ImportWizard.module.css';

// Extended steps to include Notion-specific flow
type NotionStep =
  | 'notion-connect'
  | 'notion-databases'
  | 'notion-types'
  | 'notion-standalone';
type AllSteps = ImportStep | NotionStep;

// Step sequences for different flows
const FILE_STEPS: ImportStep[] = [
  'source',
  'files',
  'preview',
  'progress',
  'success',
];
const NOTION_STEPS: AllSteps[] = [
  'source',
  'notion-connect',
  'notion-databases',
  'notion-types',
  'notion-standalone',
  'progress',
  'success',
];

export function ImportWizard() {
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();

  // Common state
  const [step, setStep] = useState<AllSteps>('source');
  const [source, setSource] = useState<ImportSource | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // File-based flow state
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  // Notion API flow state
  const [notionClient, setNotionClient] = useState<NotionClient | null>(null);
  const [selectedDatabases, setSelectedDatabases] = useState<
    SelectedDatabase[]
  >([]);

  // Determine which step sequence to use
  const isNotionFlow = source === 'notion';
  const steps = isNotionFlow ? NOTION_STEPS : FILE_STEPS;

  const handleSourceSelect = useCallback((newSource: ImportSource) => {
    setSource(newSource);
    if (newSource === 'notion') {
      setStep('notion-connect');
    } else {
      setStep('files');
    }
  }, []);

  // Notion flow handlers
  const handleNotionConnect = useCallback((client: NotionClient) => {
    setNotionClient(client);
    setStep('notion-databases');
  }, []);

  const handleDatabasesSelected = useCallback(
    (databases: SelectedDatabase[]) => {
      setSelectedDatabases(databases);
      setStep('notion-types');
    },
    []
  );

  const handleTypeMappingComplete = useCallback(() => {
    setStep('notion-standalone');
  }, []);

  const startNotionImport = useCallback(
    async (includeStandalonePages: boolean) => {
      if (!store || !notionClient) return;

      const startTime = Date.now();

      setProgress({
        current: 0,
        total: 0,
        currentDocument: 'Connecting to Notion...',
        phase: 'parsing',
        startTime,
      });

      try {
        const { importFromNotion } = await import('@/lib/import/notion-import');

        const importResult = await importFromNotion({
          client: notionClient,
          store,
          databases: selectedDatabases,
          importStandalonePages: includeStandalonePages,
          onProgress: (notionProgress: NotionImportProgress) => {
            setProgress({
              current: notionProgress.pagesImported,
              total: notionProgress.totalPages,
              currentDocument:
                notionProgress.currentPage || notionProgress.message,
              phase:
                notionProgress.phase === 'complete'
                  ? 'complete'
                  : notionProgress.phase === 'linking'
                    ? 'linking'
                    : notionProgress.phase === 'importing'
                      ? 'importing'
                      : 'parsing',
              startTime,
            });
          },
        });

        // Save changes
        refreshData();

        setResult({
          imported: importResult.imported,
          skipped: importResult.skipped,
          errors: importResult.errors.length,
          warnings: importResult.errors,
          objectIds: Array.from(importResult.idMapping.values()),
        });

        setStep('success');

        if (importResult.imported > 0) {
          addToast({
            type: 'success',
            message: `Imported ${importResult.imported} item${importResult.imported !== 1 ? 's' : ''} from Notion`,
          });
        }
      } catch (error) {
        setResult({
          imported: 0,
          skipped: 0,
          errors: 1,
          warnings: [error instanceof Error ? error.message : 'Import failed'],
          objectIds: [],
        });
        setStep('success');
      }
    },
    [store, notionClient, selectedDatabases, refreshData, addToast]
  );

  const handleStandaloneChoice = useCallback(
    (option: StandaloneImportOption) => {
      setStep('progress');
      // Start the import immediately
      startNotionImport(option === 'import');
    },
    [startNotionImport]
  );

  // File-based flow handlers
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const items: PreviewItem[] = [];

      for (const file of files) {
        try {
          const content = await file.text();

          // For JSON backup, handle differently
          if (source === 'json') {
            items.push({
              id: generateId(),
              filename: file.name,
              title: `Backup: ${file.name}`,
              inferredType: 'backup',
              properties: {},
              content,
              selected: true,
              errors: [],
              warnings: [],
            });
            continue;
          }

          // Parse markdown
          const parsed = importMarkdown(content, {
            filePath: file.name,
            extractTitleFromH1: true,
          });

          items.push({
            id: generateId(),
            filename: file.name,
            title: parsed.title || file.name.replace(/\.md$/, ''),
            inferredType: parsed.typeId || BuiltInTypeIds.NOTE,
            properties: parsed.properties,
            content: JSON.stringify(parsed.blocks),
            selected: true,
            errors: parsed.errors,
            warnings: [],
          });
        } catch (error) {
          items.push({
            id: generateId(),
            filename: file.name,
            title: file.name,
            inferredType: BuiltInTypeIds.NOTE,
            properties: {},
            content: '',
            selected: false,
            errors: [
              error instanceof Error ? error.message : 'Failed to parse file',
            ],
            warnings: [],
          });
        }
      }

      setPreviewItems(items);
      setStep('preview');
    },
    [source]
  );

  const handleStartImport = useCallback(
    async (items: PreviewItem[]) => {
      if (!store) return;

      setStep('progress');
      const startTime = Date.now();
      const objectIds: string[] = [];
      const warnings: string[] = [];
      let imported = 0;
      const skipped = 0;
      let errors = 0;

      setProgress({
        current: 0,
        total: items.length,
        currentDocument: '',
        phase: 'importing',
        startTime,
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        setProgress({
          current: i,
          total: items.length,
          currentDocument: item.title,
          phase: 'importing',
          startTime,
        });

        try {
          // Parse the content blocks
          let blocks = [];
          try {
            blocks = item.content ? JSON.parse(item.content) : [];
          } catch {
            // If content is not JSON, it might be raw markdown
            blocks = [];
          }

          // Create the object
          const obj = store.create({
            typeId: item.inferredType,
            properties: {
              title: item.title,
              ...item.properties,
            },
            withContent: blocks.length > 0,
            inboxed: true,
          });

          // Set content if we have blocks
          if (blocks.length > 0) {
            store.setContent(obj.id, JSON.stringify(blocks));
          }

          objectIds.push(obj.id);
          imported++;
        } catch (error) {
          errors++;
          warnings.push(
            `Failed to import "${item.title}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }

      // Linking phase
      setProgress({
        current: items.length,
        total: items.length,
        currentDocument: 'Resolving links...',
        phase: 'linking',
        startTime,
      });

      // Complete
      setProgress({
        current: items.length,
        total: items.length,
        currentDocument: '',
        phase: 'complete',
        startTime,
      });

      // Save changes
      refreshData();

      setResult({
        imported,
        skipped,
        errors,
        warnings,
        objectIds,
      });

      setStep('success');

      if (imported > 0) {
        addToast({
          type: 'success',
          message: `Imported ${imported} document${imported !== 1 ? 's' : ''}`,
        });
      }
    },
    [store, refreshData, addToast]
  );

  const handleReset = useCallback(() => {
    setStep('source');
    setSource(null);
    setPreviewItems([]);
    setProgress(null);
    setResult(null);
    setNotionClient(null);
    setSelectedDatabases([]);
  }, []);

  // Go back one step
  const handleBack = useCallback(() => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [step, steps]);

  // Step indicator
  const renderStepIndicator = () => {
    const currentIndex = steps.indexOf(step);

    // Use simplified steps for indicator
    const indicatorSteps = isNotionFlow
      ? ['source', 'connect', 'select', 'map', 'pages', 'import', 'done']
      : ['source', 'files', 'preview', 'import', 'done'];

    const indicatorIndex = isNotionFlow
      ? [
          'source',
          'notion-connect',
          'notion-databases',
          'notion-types',
          'notion-standalone',
          'progress',
          'success',
        ].indexOf(step)
      : currentIndex;

    return (
      <div className={classes.stepIndicator}>
        {indicatorSteps.map((_, i) => {
          const isActive = i === indicatorIndex;
          const isCompleted = i < indicatorIndex;
          return (
            <div
              key={i}
              className={classes.stepDot}
              data-active={isActive || undefined}
              data-completed={isCompleted || undefined}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Box>
      {step !== 'source' && step !== 'success' && renderStepIndicator()}

      {/* Source selection */}
      {step === 'source' && (
        <ImportSourceSelector value={source} onChange={handleSourceSelect} />
      )}

      {/* Notion API flow */}
      {step === 'notion-connect' && (
        <NotionConnect
          onConnect={handleNotionConnect}
          onBack={() => setStep('source')}
        />
      )}

      {step === 'notion-databases' && notionClient && (
        <NotionDatabasePicker
          client={notionClient}
          onContinue={handleDatabasesSelected}
          onBack={() => setStep('notion-connect')}
        />
      )}

      {step === 'notion-types' && (
        <NotionTypeMapper
          databases={selectedDatabases}
          onDatabasesChange={setSelectedDatabases}
          onStartImport={handleTypeMappingComplete}
          onBack={() => setStep('notion-databases')}
        />
      )}

      {step === 'notion-standalone' && notionClient && (
        <StandalonePageOptions
          client={notionClient}
          onContinue={handleStandaloneChoice}
          onBack={() => setStep('notion-types')}
        />
      )}

      {/* File-based flow */}
      {step === 'files' && source && source !== 'notion' && (
        <ImportFilePicker
          source={source}
          onFilesSelected={handleFilesSelected}
          onBack={() => setStep('source')}
        />
      )}

      {step === 'preview' && (
        <ImportPreview
          items={previewItems}
          onItemsChange={setPreviewItems}
          onStartImport={handleStartImport}
          onBack={handleBack}
        />
      )}

      {/* Shared steps */}
      {step === 'progress' && progress && (
        <ImportProgressView progress={progress} />
      )}

      {step === 'success' && result && (
        <ImportSuccess result={result} onImportMore={handleReset} />
      )}
    </Box>
  );
}
