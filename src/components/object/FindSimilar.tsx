/**
 * FindSimilar - Shows semantically similar objects to the current object
 * Only visible when semantic search is enabled
 */

import { useState, useEffect, useCallback } from 'react';
import { useObjects, useTypeRegistry, useNavigation, useSemanticSearchSafe } from '@/contexts';
import { EmptyState } from '@/components/ui';
import { copyMentionToClipboard } from '@/lib/editor';
import type { SemanticSearchResult } from '@/lib/semantic';
import './FindSimilar.css';

interface FindSimilarProps {
  objectId: string;
}

interface SimilarItem {
  id: string;
  title: string;
  typeIcon: string;
  typeName: string;
  typeId: string;
  similarity: number;
}

export function FindSimilar({ objectId }: FindSimilarProps) {
  const { store } = useObjects();
  const typeRegistry = useTypeRegistry();
  const { navigateToObject } = useNavigation();
  const semanticContext = useSemanticSearchSafe();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [similarCount, setSimilarCount] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check if semantic search is available
  const isSemanticEnabled = semanticContext?.isEnabled && semanticContext?.status === 'ready';
  const threshold = semanticContext?.threshold ?? 0.2;

  // Find similar objects (full data)
  const findSimilarObjects = useCallback(async () => {
    if (!semanticContext || !store) return;

    const engine = semanticContext.getEngine();
    if (!engine || engine.status !== 'ready') return;

    setIsLoading(true);

    try {
      const results: SemanticSearchResult[] = await engine.findSimilar(objectId, {
        limit: 5,
        threshold,
      });

      // Convert to display items
      const items: SimilarItem[] = results
        .filter((r) => r.objectId !== objectId) // Exclude self
        .map((result) => {
          const obj = store.get(result.objectId);
          if (!obj) return null;

          const typeDef = typeRegistry.get(obj.typeId);
          const title = String(obj.properties.title ?? obj.properties.name ?? 'Untitled');

          return {
            id: obj.id,
            title,
            typeIcon: typeDef?.icon ?? '📄',
            typeName: typeDef?.name ?? obj.typeId,
            typeId: obj.typeId,
            similarity: result.score,
          };
        })
        .filter((item): item is SimilarItem => item !== null);

      setSimilarItems(items);
      setSimilarCount(items.length);
    } catch (error) {
      console.error('Failed to find similar objects:', error);
      setSimilarItems([]);
      setSimilarCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [semanticContext, store, typeRegistry, objectId, threshold]);

  // Fetch count on mount and when object/threshold changes
  useEffect(() => {
    if (!isSemanticEnabled || !semanticContext || !store) {
      setSimilarCount(null);
      return;
    }

    const engine = semanticContext.getEngine();
    if (!engine || engine.status !== 'ready') {
      setSimilarCount(null);
      return;
    }

    // Fetch count (lightweight query)
    engine.findSimilar(objectId, { limit: 5, threshold })
      .then((results) => {
        const count = results.filter((r) => r.objectId !== objectId).length;
        setSimilarCount(count);
      })
      .catch(() => {
        setSimilarCount(0);
      });
  }, [objectId, isSemanticEnabled, semanticContext, store, threshold]);

  // Reset when object changes
  useEffect(() => {
    setSimilarItems([]);
    setSimilarCount(null);
  }, [objectId]);

  // Trigger full search when expanded (if not already loaded)
  useEffect(() => {
    if (isExpanded && similarItems.length === 0 && !isLoading && isSemanticEnabled) {
      findSimilarObjects();
    }
  }, [isExpanded, similarItems.length, isLoading, isSemanticEnabled, findSimilarObjects]);

  // Don't render if semantic search is not enabled
  if (!isSemanticEnabled) {
    return null;
  }

  const handleItemClick = (itemId: string) => {
    navigateToObject(itemId);
  };

  // Copy mention to clipboard (can be pasted as actual mention in editor)
  const handleCopyMention = useCallback(async (item: SimilarItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger item click

    const success = await copyMentionToClipboard({
      objectId: item.id,
      objectName: item.title,
      objectTypeId: item.typeId,
    });

    if (success) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // Display count - use similarItems.length if loaded, otherwise similarCount
  const displayCount = similarItems.length > 0 ? similarItems.length : similarCount;

  return (
    <section className="find-similar">
      <button
        type="button"
        className="find-similar__header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="find-similar__collapse-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        <h2 className="find-similar__title">
          Find Similar
          {displayCount !== null && displayCount > 0 && ` (${displayCount})`}
        </h2>
        <span className="find-similar__badge">AI</span>
      </button>

      {isExpanded && (
        <div className="find-similar__list">
          {isLoading ? (
            <div className="find-similar__loading">Finding similar objects...</div>
          ) : similarItems.length === 0 ? (
            <EmptyState message="No similar objects found" size="small" />
          ) : (
            similarItems.map((item) => (
              <div key={item.id} className="find-similar__item-row">
                <button
                  type="button"
                  className="find-similar__item"
                  onClick={() => handleItemClick(item.id)}
                >
                  <span className="find-similar__item-icon">{item.typeIcon}</span>
                  <span className="find-similar__item-name">{item.title}</span>
                  <span className="find-similar__item-similarity">
                    {Math.round(item.similarity * 100)}%
                  </span>
                </button>
                <button
                  type="button"
                  className={`find-similar__copy-btn ${copiedId === item.id ? 'find-similar__copy-btn--copied' : ''}`}
                  onClick={(e) => handleCopyMention(item, e)}
                  title="Copy mention (paste in editor to link)"
                >
                  {copiedId === item.id ? '✓' : '@'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
