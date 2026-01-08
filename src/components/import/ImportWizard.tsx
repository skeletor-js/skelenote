/**
 * Import Wizard
 *
 * Multi-step wizard for importing documents from various sources.
 * Lives inside the DataSettings panel.
 */

import { useState, useCallback } from 'react';
import { Box } from '@mantine/core';
import { useObjects, useToast } from '@/contexts';
import { importMarkdown } from '@/lib/import';
import { BuiltInTypeIds, generateId } from '@/lib/types';
import { ImportSourceSelector } from './ImportSourceSelector';
import { ImportFilePicker } from './ImportFilePicker';
import { ImportPreview } from './ImportPreview';
import { ImportProgressView } from './ImportProgressView';
import { ImportSuccess } from './ImportSuccess';
import type {
  ImportSource,
  ImportStep,
  PreviewItem,
  ImportProgress,
  ImportResult,
} from './types';
import classes from './ImportWizard.module.css';

const STEPS: ImportStep[] = [
  'source',
  'files',
  'preview',
  'progress',
  'success',
];

export function ImportWizard() {
  const { store, refreshData } = useObjects();
  const { addToast } = useToast();

  const [step, setStep] = useState<ImportStep>('source');
  const [source, setSource] = useState<ImportSource | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSourceSelect = useCallback((newSource: ImportSource) => {
    setSource(newSource);
    setStep('files');
  }, []);

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

      // For now, we skip link resolution - can be added later
      // This would resolve wiki-links and create relations

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
  }, []);

  // Step indicator
  const renderStepIndicator = () => {
    const currentIndex = STEPS.indexOf(step);

    return (
      <div className={classes.stepIndicator}>
        {STEPS.map((s, i) => {
          const isActive = s === step;
          const isCompleted = i < currentIndex;
          return (
            <div
              key={s}
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

      {step === 'source' && (
        <ImportSourceSelector value={source} onChange={handleSourceSelect} />
      )}

      {step === 'files' && source && (
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
          onBack={() => setStep('files')}
        />
      )}

      {step === 'progress' && progress && (
        <ImportProgressView progress={progress} />
      )}

      {step === 'success' && result && (
        <ImportSuccess result={result} onImportMore={handleReset} />
      )}
    </Box>
  );
}
