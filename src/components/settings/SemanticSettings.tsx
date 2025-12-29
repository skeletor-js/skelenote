/**
 * Semantic Search Settings
 *
 * Settings panel for enabling/disabling semantic search and managing the index.
 */

import { useState, useCallback } from 'react';
import { useSemanticSearchSafe, useObjects } from '@/contexts';
import { SemanticEnableModal } from './SemanticEnableModal';
import { IndexableContent } from '@/lib/semantic';
import './SemanticSettings.css';

export function SemanticSettings() {
  const semanticContext = useSemanticSearchSafe();
  const objectsContext = useObjects();
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Get indexable content from objects
  const getIndexableContent = useCallback((): IndexableContent[] => {
    if (!objectsContext?.store) return [];

    const store = objectsContext.store;
    const objects = store.getAll();
    const typeRegistry = objectsContext.typeRegistry;

    return objects.map((obj) => {
      // Get title from properties
      const titleProp = obj.properties.title ?? obj.properties.name;
      const title = typeof titleProp === 'string' ? titleProp : obj.id;

      // Get content if object has content
      let content = '';
      if (obj.hasContent) {
        const rawContent = store.getContent(obj.id);
        if (rawContent) {
          // Extract plain text from BlockNote content
          try {
            const blocks = JSON.parse(rawContent);
            content = extractPlainText(blocks);
          } catch {
            content = rawContent;
          }
        }
      }

      // Add properties to content for better matching
      const propTexts: string[] = [];
      const typeDef = typeRegistry?.get(obj.typeId);
      if (typeDef?.schema) {
        for (const propDef of typeDef.schema) {
          const value = obj.properties[propDef.id];
          if (value && typeof value === 'string' && propDef.type === 'text') {
            propTexts.push(value);
          }
        }
      }

      return {
        objectId: obj.id,
        title,
        content: [content, ...propTexts].filter(Boolean).join('\n'),
      };
    });
  }, [objectsContext]);

  const handleEnable = useCallback(async () => {
    if (!semanticContext) return;
    const content = getIndexableContent();
    await semanticContext.enable(content);
  }, [semanticContext, getIndexableContent]);

  const handleRemove = useCallback(async () => {
    if (!semanticContext) return;
    setIsRemoving(true);
    try {
      await semanticContext.disable(true);
    } finally {
      setIsRemoving(false);
      setShowRemoveConfirm(false);
    }
  }, [semanticContext]);

  const handleRebuildIndex = useCallback(async () => {
    if (!semanticContext) return;
    setIsRebuilding(true);
    try {
      const content = getIndexableContent();
      await semanticContext.rebuildIndex(content);
    } finally {
      setIsRebuilding(false);
    }
  }, [semanticContext, getIndexableContent]);

  if (!semanticContext) {
    return null;
  }

  const { isEnabled, status, indexedCount, progress, error, threshold, setThreshold } = semanticContext;

  // Format last indexed time
  const formatLastIndexed = () => {
    const engine = semanticContext.getEngine();
    const stats = engine?.getStats();
    if (!stats?.lastIndexedAt) return 'Never';

    const diff = Date.now() - stats.lastIndexedAt;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(stats.lastIndexedAt).toLocaleDateString();
  };

  return (
    <section className="semantic-settings">
      <h2 className="semantic-settings__title">Semantic Search</h2>

      {!isEnabled ? (
        // Not enabled state
        <div className="semantic-settings__section">
          <div className="semantic-settings__toggle-row">
            <label className="semantic-settings__toggle-label">
              <input
                type="checkbox"
                className="semantic-settings__checkbox"
                checked={false}
                onChange={() => setShowEnableModal(true)}
              />
              <span className="semantic-settings__toggle-text">Enable semantic search</span>
            </label>
          </div>

          <p className="semantic-settings__help">
            Find conceptually similar content, not just keyword matches.
            All processing happens locally on your device.
          </p>

          <div className="semantic-settings__info-box">
            <ul className="semantic-settings__info-list">
              <li>Requires one-time 23MB download</li>
              <li>Uses ~500MB RAM when active</li>
              <li>Works offline after setup</li>
            </ul>
          </div>
        </div>
      ) : (
        // Enabled state
        <>
          <div className="semantic-settings__section">
            <div className="semantic-settings__toggle-row">
              <label className="semantic-settings__toggle-label">
                <input
                  type="checkbox"
                  className="semantic-settings__checkbox"
                  checked={true}
                  onChange={() => setShowRemoveConfirm(true)}
                />
                <span className="semantic-settings__toggle-text">Enable semantic search</span>
              </label>
              <span className={`semantic-settings__status semantic-settings__status--${status}`}>
                {status === 'ready' ? 'Active' : status === 'indexing' ? 'Indexing...' : status}
              </span>
            </div>
          </div>

          <div className="semantic-settings__divider" />

          <div className="semantic-settings__section">
            <label className="semantic-settings__label">Index Status</label>
            <div className="semantic-settings__stats">
              <div className="semantic-settings__stat">
                <span className="semantic-settings__stat-value">{indexedCount}</span>
                <span className="semantic-settings__stat-label">objects indexed</span>
              </div>
              <div className="semantic-settings__stat">
                <span className="semantic-settings__stat-value">{formatLastIndexed()}</span>
                <span className="semantic-settings__stat-label">last updated</span>
              </div>
            </div>

            {progress && (
              <div className="semantic-settings__progress">
                <div className="semantic-settings__progress-bar">
                  <div
                    className="semantic-settings__progress-fill"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="semantic-settings__progress-text">{progress.message}</span>
              </div>
            )}

            <button
              className="semantic-settings__button semantic-settings__button--secondary"
              onClick={handleRebuildIndex}
              disabled={isRebuilding || status !== 'ready'}
            >
              {isRebuilding ? 'Rebuilding...' : 'Rebuild Index'}
            </button>
            <p className="semantic-settings__help">
              Use if search quality degrades or after bulk imports.
            </p>
          </div>

          <div className="semantic-settings__divider" />

          <div className="semantic-settings__section">
            <label className="semantic-settings__label">Similarity Threshold</label>
            <p className="semantic-settings__help">
              Controls how closely related results must be.
              Lower = more results, Higher = stricter matching.
            </p>
            <div className="semantic-settings__presets">
              <button
                type="button"
                className={`semantic-settings__preset ${threshold <= 0.15 ? 'semantic-settings__preset--active' : ''}`}
                onClick={() => setThreshold(0.15)}
              >
                Broad (15%)
              </button>
              <button
                type="button"
                className={`semantic-settings__preset ${threshold > 0.15 && threshold <= 0.25 ? 'semantic-settings__preset--active' : ''}`}
                onClick={() => setThreshold(0.2)}
              >
                Balanced (20%)
              </button>
              <button
                type="button"
                className={`semantic-settings__preset ${threshold > 0.25 && threshold <= 0.45 ? 'semantic-settings__preset--active' : ''}`}
                onClick={() => setThreshold(0.35)}
              >
                Strict (35%)
              </button>
              <button
                type="button"
                className={`semantic-settings__preset ${threshold > 0.45 ? 'semantic-settings__preset--active' : ''}`}
                onClick={() => setThreshold(0.5)}
              >
                Very Strict (50%)
              </button>
            </div>
          </div>

          <div className="semantic-settings__divider" />

          <div className="semantic-settings__section semantic-settings__section--danger">
            <label className="semantic-settings__label">Remove Semantic Search</label>
            <p className="semantic-settings__help">
              Disables the feature and deletes the model and index to free ~50MB storage.
            </p>

            {showRemoveConfirm ? (
              <div className="semantic-settings__confirm-row">
                <span className="semantic-settings__confirm-text">Are you sure?</span>
                <button
                  className="semantic-settings__button semantic-settings__button--danger"
                  onClick={handleRemove}
                  disabled={isRemoving}
                >
                  {isRemoving ? 'Removing...' : 'Yes, Remove'}
                </button>
                <button
                  className="semantic-settings__button semantic-settings__button--secondary"
                  onClick={() => setShowRemoveConfirm(false)}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="semantic-settings__button semantic-settings__button--danger-outline"
                onClick={() => setShowRemoveConfirm(true)}
              >
                Remove Semantic Search
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="semantic-settings__error">
          {error}
        </div>
      )}

      <SemanticEnableModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onConfirm={handleEnable}
        progress={progress}
        error={error}
      />
    </section>
  );
}

/**
 * Extract plain text from BlockNote blocks.
 */
function extractPlainText(blocks: unknown[]): string {
  const texts: string[] = [];

  function processBlock(block: unknown) {
    if (!block || typeof block !== 'object') return;

    const b = block as Record<string, unknown>;

    // Extract text content
    if (b.content && Array.isArray(b.content)) {
      for (const item of b.content) {
        if (item && typeof item === 'object') {
          const c = item as Record<string, unknown>;
          if (c.type === 'text' && typeof c.text === 'string') {
            texts.push(c.text);
          } else if (c.type === 'link' && typeof c.text === 'string') {
            texts.push(c.text);
          }
        }
      }
    }

    // Process children
    if (b.children && Array.isArray(b.children)) {
      for (const child of b.children) {
        processBlock(child);
      }
    }
  }

  for (const block of blocks) {
    processBlock(block);
  }

  return texts.join(' ');
}
