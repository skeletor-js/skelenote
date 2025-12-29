/**
 * FindSimilar - Shows semantically similar objects to the current object
 * Only visible when semantic search is enabled
 */

import { useState, useEffect, useCallback } from 'react';
import { useObjects, useTypeRegistry, useNavigation, useSemanticSearchSafe } from '@/contexts';
import { EmptyState } from '@/components/ui';
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
  const [hasSearched, setHasSearched] = useState(false);

  // Check if semantic search is available
  const isSemanticEnabled = semanticContext?.isEnabled && semanticContext?.status === 'ready';

  // Find similar objects when expanded
  const findSimilarObjects = useCallback(async () => {
    if (!semanticContext || !store) return;

    const engine = semanticContext.getEngine();
    if (!engine || engine.status !== 'ready') return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const results: SemanticSearchResult[] = await engine.findSimilar(objectId, {
        limit: 5,
        threshold: 0.15, // Low threshold to capture conceptual relationships
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
            similarity: result.score,
          };
        })
        .filter((item): item is SimilarItem => item !== null);

      setSimilarItems(items);
    } catch (error) {
      console.error('Failed to find similar objects:', error);
      setSimilarItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [semanticContext, store, typeRegistry, objectId]);

  // Trigger search when expanded
  useEffect(() => {
    if (isExpanded && !hasSearched && isSemanticEnabled) {
      findSimilarObjects();
    }
  }, [isExpanded, hasSearched, isSemanticEnabled, findSimilarObjects]);

  // Reset when object changes
  useEffect(() => {
    setSimilarItems([]);
    setHasSearched(false);
  }, [objectId]);

  // Don't render if semantic search is not enabled
  if (!isSemanticEnabled) {
    return null;
  }

  const handleItemClick = (itemId: string) => {
    navigateToObject(itemId);
  };

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
          {similarItems.length > 0 && ` (${similarItems.length})`}
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
              <button
                key={item.id}
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
            ))
          )}
        </div>
      )}
    </section>
  );
}
