/**
 * PaletteItem - Individual result item in Command Palette
 */

import type { PaletteAction } from '@/lib/palette/actions';
import './CommandPalette.css';

interface PaletteItemProps {
  action: PaletteAction;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

export function PaletteItem({
  action,
  isSelected,
  onClick,
  onMouseEnter,
}: PaletteItemProps) {
  // Check if this is a semantic match
  const isSemanticMatch = action.matchType === 'semantic' || action.matchType === 'hybrid';
  const semanticPercent = action.semanticScore
    ? Math.round(action.semanticScore * 100)
    : null;

  return (
    <div
      className={`palette-item ${isSelected ? 'palette-item--selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      <span className="palette-item__icon">{action.icon}</span>
      <span className="palette-item__label">{action.label}</span>
      {isSemanticMatch && (
        <span
          className="palette-item__semantic-badge"
          title={semanticPercent ? `${semanticPercent}% similar` : 'Semantic match'}
        >
          ~{semanticPercent ? `${semanticPercent}%` : ''}
        </span>
      )}
      <span className="palette-item__category">{action.category}</span>
    </div>
  );
}
