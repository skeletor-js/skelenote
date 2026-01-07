/**
 * Search Orchestrator
 *
 * Combines full-text (Fuse.js) and semantic search results
 * using Reciprocal Rank Fusion (RRF) for hybrid search.
 */

import type { SearchResult, SearchableItem, MatchType } from './types';
import type { SemanticSearchResult } from '../semantic/types';

/**
 * Configuration for the search orchestrator
 */
export interface OrchestratorConfig {
  /** Weight for text search results (0-1, default: 0.5) */
  textWeight?: number;
  /** Weight for semantic search results (0-1, default: 0.5) */
  semanticWeight?: number;
  /** RRF constant k (higher = more even distribution, default: 60) */
  rrfK?: number;
}

const DEFAULT_CONFIG: Required<OrchestratorConfig> = {
  textWeight: 0.5,
  semanticWeight: 0.5,
  rrfK: 60,
};

/**
 * Internal representation of a ranked result
 */
interface RankedResult {
  objectId: string;
  textRank: number | null;
  semanticRank: number | null;
  textResult: SearchResult | null;
  semanticScore: number | null;
}

/**
 * Fuse text and semantic search results using Reciprocal Rank Fusion.
 *
 * RRF combines rankings from multiple sources without requiring score calibration.
 * Formula: RRF(d) = Σ 1 / (k + rank(d))
 *
 * @param textResults - Results from Fuse.js text search
 * @param semanticResults - Results from semantic search
 * @param searchableItems - Map of object ID to searchable item (for building results)
 * @param config - Orchestrator configuration
 * @returns Combined and de-duplicated results
 */
export function fuseSearchResults(
  textResults: SearchResult[],
  semanticResults: SemanticSearchResult[],
  searchableItems: Map<string, SearchableItem>,
  config: OrchestratorConfig = {}
): SearchResult[] {
  const { textWeight, semanticWeight, rrfK } = { ...DEFAULT_CONFIG, ...config };

  // Build ranked results map
  const rankedMap = new Map<string, RankedResult>();

  // Add text results with their ranks
  textResults.forEach((result, index) => {
    rankedMap.set(result.item.id, {
      objectId: result.item.id,
      textRank: index + 1, // 1-indexed rank
      semanticRank: null,
      textResult: result,
      semanticScore: null,
    });
  });

  // Add/merge semantic results
  semanticResults.forEach((result, index) => {
    const existing = rankedMap.get(result.objectId);
    if (existing) {
      existing.semanticRank = index + 1;
      existing.semanticScore = result.score;
    } else {
      rankedMap.set(result.objectId, {
        objectId: result.objectId,
        textRank: null,
        semanticRank: index + 1,
        textResult: null,
        semanticScore: result.score,
      });
    }
  });

  // Calculate RRF scores
  const scoredResults: Array<{
    objectId: string;
    rrfScore: number;
    ranked: RankedResult;
  }> = [];

  for (const ranked of rankedMap.values()) {
    let rrfScore = 0;

    // Add text component
    if (ranked.textRank !== null) {
      rrfScore += textWeight * (1 / (rrfK + ranked.textRank));
    }

    // Add semantic component
    if (ranked.semanticRank !== null) {
      rrfScore += semanticWeight * (1 / (rrfK + ranked.semanticRank));
    }

    scoredResults.push({ objectId: ranked.objectId, rrfScore, ranked });
  }

  // Sort by RRF score (higher is better)
  scoredResults.sort((a, b) => b.rrfScore - a.rrfScore);

  // Build final results
  return scoredResults.map(({ ranked, rrfScore }) => {
    // Determine match type
    let matchType: MatchType;
    if (ranked.textRank !== null && ranked.semanticRank !== null) {
      matchType = 'hybrid';
    } else if (ranked.semanticRank !== null) {
      matchType = 'semantic';
    } else {
      matchType = 'text';
    }

    // If we have a text result, use it as base
    if (ranked.textResult) {
      return {
        ...ranked.textResult,
        score: rrfScore,
        matchType,
        semanticScore: ranked.semanticScore ?? undefined,
      };
    }

    // Otherwise, create a new result from semantic match
    const item = searchableItems.get(ranked.objectId);
    if (!item) {
      // Fallback - create minimal item
      return {
        item: {
          id: ranked.objectId,
          typeId: 'unknown',
          title: 'Unknown',
          properties: '',
          content: '',
        },
        score: rrfScore,
        matches: [],
        matchType,
        semanticScore: ranked.semanticScore ?? undefined,
      };
    }

    return {
      item,
      score: rrfScore,
      matches: [], // No text matches for semantic-only results
      matchType,
      semanticScore: ranked.semanticScore ?? undefined,
    };
  });
}

/**
 * Convert semantic results to SearchResults without fusion.
 * Useful when only semantic search is performed.
 */
export function semanticToSearchResults(
  semanticResults: SemanticSearchResult[],
  searchableItems: Map<string, SearchableItem>
): SearchResult[] {
  return semanticResults.map((result) => {
    const item = searchableItems.get(result.objectId);

    if (!item) {
      return {
        item: {
          id: result.objectId,
          typeId: 'unknown',
          title: 'Unknown',
          properties: '',
          content: '',
        },
        score: result.score,
        matches: [],
        matchType: 'semantic' as MatchType,
        semanticScore: result.score,
      };
    }

    return {
      item,
      score: result.score,
      matches: [],
      matchType: 'semantic' as MatchType,
      semanticScore: result.score,
    };
  });
}
