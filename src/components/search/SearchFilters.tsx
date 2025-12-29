/**
 * SearchFilters - Filter controls for the Search Results page
 * Allows filtering by match type and object type
 */

import { useCallback } from 'react';
import { useTypeRegistry } from '@/contexts';
import type { MatchType } from '@/lib/search';
import type { SearchFilters as FilterState } from '@/hooks';
import './SearchFilters.css';

interface SearchFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Update filter state */
  onFiltersChange: (filters: FilterState) => void;
  /** Whether any filters are active */
  hasActiveFilters: boolean;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Whether semantic search is available */
  isSemanticAvailable: boolean;
}

const MATCH_TYPES: { value: MatchType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'semantic', label: 'Semantic' },
  { value: 'hybrid', label: 'Hybrid' },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  hasActiveFilters,
  onClearFilters,
  isSemanticAvailable,
}: SearchFiltersProps) {
  const typeRegistry = useTypeRegistry();

  // Get all available object types
  const objectTypes = Array.from(typeRegistry.getAll()).map((type) => ({
    value: type.id,
    label: type.name,
    icon: type.icon,
  }));

  // Toggle a match type filter
  const toggleMatchType = useCallback(
    (matchType: MatchType) => {
      const current = filters.matchTypes;
      const updated = current.includes(matchType)
        ? current.filter((t) => t !== matchType)
        : [...current, matchType];
      onFiltersChange({ ...filters, matchTypes: updated });
    },
    [filters, onFiltersChange]
  );

  // Toggle an object type filter
  const toggleObjectType = useCallback(
    (typeId: string) => {
      const current = filters.objectTypes;
      const updated = current.includes(typeId)
        ? current.filter((t) => t !== typeId)
        : [...current, typeId];
      onFiltersChange({ ...filters, objectTypes: updated });
    },
    [filters, onFiltersChange]
  );

  // Check if a match type is checked (empty array means all are included)
  const isMatchTypeChecked = (matchType: MatchType) => {
    if (filters.matchTypes.length === 0) return true;
    return filters.matchTypes.includes(matchType);
  };

  // Check if an object type is checked (empty array means all are included)
  const isObjectTypeChecked = (typeId: string) => {
    if (filters.objectTypes.length === 0) return true;
    return filters.objectTypes.includes(typeId);
  };

  return (
    <div className="search-filters">
      {/* Match type filters */}
      <div className="search-filters__group">
        <span className="search-filters__label">Match:</span>
        <div className="search-filters__options">
          {MATCH_TYPES.map((type) => {
            // Hide semantic/hybrid options if not available
            if (!isSemanticAvailable && type.value !== 'text') {
              return null;
            }
            return (
              <label key={type.value} className="search-filters__checkbox">
                <input
                  type="checkbox"
                  checked={isMatchTypeChecked(type.value)}
                  onChange={() => toggleMatchType(type.value)}
                />
                <span className="search-filters__checkbox-label">{type.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Object type filter */}
      <div className="search-filters__group">
        <span className="search-filters__label">Type:</span>
        <div className="search-filters__options">
          {objectTypes.map((type) => (
            <label key={type.value} className="search-filters__checkbox">
              <input
                type="checkbox"
                checked={isObjectTypeChecked(type.value)}
                onChange={() => toggleObjectType(type.value)}
              />
              <span className="search-filters__checkbox-label">
                <span className="search-filters__type-icon">{type.icon}</span>
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          className="search-filters__clear"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
