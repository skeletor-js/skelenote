/**
 * Export Settings
 *
 * Settings panel for bulk exporting all objects to a ZIP file.
 */

import { useState, useCallback } from 'react';
import { useObjects, useTypeRegistry, useToast } from '@/contexts';
import { exportAllToZip, type BulkExportProgress } from '@/lib/export';
import './ExportSettings.css';

export function ExportSettings() {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { addToast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<BulkExportProgress | null>(null);
  const [organizeByType, setOrganizeByType] = useState(true);

  // Get object counts for display
  const objectCounts = useCallback(() => {
    if (!store) return { total: 0, notes: 0, tasks: 0, projects: 0, others: 0 };

    const all = store.getAll();
    const nonDaily = all.filter((obj) => !obj.properties.isDailyNote);

    return {
      total: nonDaily.length,
      notes: nonDaily.filter((obj) => obj.typeId === 'note').length,
      tasks: nonDaily.filter((obj) => obj.typeId === 'task').length,
      projects: nonDaily.filter((obj) => obj.typeId === 'project').length,
      others: nonDaily.filter(
        (obj) => !['note', 'task', 'project'].includes(obj.typeId)
      ).length,
    };
  }, [store]);

  const handleExport = useCallback(async () => {
    if (!store || !typeRegistry) return;

    setIsExporting(true);
    setProgress(null);

    try {
      const objects = store.getAll();

      // Create resolver function for object names
      const resolveObjectName = (id: string): string | undefined => {
        const obj = store.get(id);
        if (!obj) return undefined;
        const name = obj.properties.title ?? obj.properties.name;
        return name ? String(name) : undefined;
      };

      // Create content getter
      const getContent = (objectId: string): string => {
        try {
          return store.getContent(objectId);
        } catch {
          return '';
        }
      };

      const filePath = await exportAllToZip(
        objects,
        typeRegistry,
        getContent,
        resolveObjectName,
        { organizeByType },
        setProgress
      );

      if (filePath) {
        const filename = filePath.split('/').pop() || filePath;
        addToast({
          type: 'success',
          message: `Exported ${progress?.total || objectCounts().total} objects to ${filename}`,
        });
      }
    } catch (error) {
      console.error('Bulk export failed:', error);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Export failed. Please try again.',
      });
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [store, typeRegistry, organizeByType, addToast, progress?.total, objectCounts]);

  const counts = objectCounts();

  // Calculate progress percentage
  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const getProgressMessage = () => {
    if (!progress) return '';
    switch (progress.phase) {
      case 'preparing':
        return 'Preparing export...';
      case 'exporting':
        return `Exporting ${progress.currentObject || '...'}`;
      case 'compressing':
        return 'Creating ZIP file...';
      case 'complete':
        return 'Export complete!';
      default:
        return '';
    }
  };

  return (
    <section className="export-settings">
      <h2 className="export-settings__title">Export Data</h2>

      <div className="export-settings__section">
        <p className="export-settings__description">
          Export all your objects as Markdown files in a ZIP archive.
          Perfect for backups or migrating to other tools like Obsidian.
        </p>

        <div className="export-settings__stats">
          <div className="export-settings__stat">
            <span className="export-settings__stat-value">{counts.total}</span>
            <span className="export-settings__stat-label">total objects</span>
          </div>
          {counts.notes > 0 && (
            <div className="export-settings__stat">
              <span className="export-settings__stat-value">{counts.notes}</span>
              <span className="export-settings__stat-label">notes</span>
            </div>
          )}
          {counts.tasks > 0 && (
            <div className="export-settings__stat">
              <span className="export-settings__stat-value">{counts.tasks}</span>
              <span className="export-settings__stat-label">tasks</span>
            </div>
          )}
          {counts.projects > 0 && (
            <div className="export-settings__stat">
              <span className="export-settings__stat-value">{counts.projects}</span>
              <span className="export-settings__stat-label">projects</span>
            </div>
          )}
        </div>
      </div>

      <div className="export-settings__divider" />

      <div className="export-settings__section">
        <label className="export-settings__label">Options</label>

        <label className="export-settings__toggle-label">
          <input
            type="checkbox"
            className="export-settings__checkbox"
            checked={organizeByType}
            onChange={(e) => setOrganizeByType(e.target.checked)}
            disabled={isExporting}
          />
          <span className="export-settings__toggle-text">
            Organize files into folders by type
          </span>
        </label>
        <p className="export-settings__help">
          Creates folders like /notes/, /tasks/, /projects/ in the ZIP.
        </p>
      </div>

      <div className="export-settings__divider" />

      <div className="export-settings__section">
        {progress && (
          <div className="export-settings__progress">
            <div className="export-settings__progress-bar">
              <div
                className="export-settings__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="export-settings__progress-text">
              {getProgressMessage()} ({progress.current}/{progress.total})
            </span>
          </div>
        )}

        <button
          className="export-settings__button export-settings__button--primary"
          onClick={handleExport}
          disabled={isExporting || counts.total === 0}
        >
          {isExporting ? 'Exporting...' : `Export All (${counts.total} objects)`}
        </button>

        <p className="export-settings__help">
          Each object becomes a Markdown file with YAML frontmatter.
          Mentions are converted to [[wiki-links]].
        </p>
      </div>
    </section>
  );
}
