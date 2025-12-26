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
      <span className="palette-item__category">{action.category}</span>
    </div>
  );
}
