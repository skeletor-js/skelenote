/**
 * ShortcutCategory - Category section with header and shortcut list
 */

import { ShortcutRow } from './ShortcutRow';
import { CATEGORY_INFO, type Shortcut, type ShortcutCategory as CategoryType } from '@/lib/shortcuts';
import './KeyboardShortcutsModal.css';

interface ShortcutCategoryProps {
  category: CategoryType;
  shortcuts: Shortcut[];
}

export function ShortcutCategory({ category, shortcuts }: ShortcutCategoryProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  const categoryInfo = CATEGORY_INFO[category];

  return (
    <div className="shortcut-category" role="group" aria-labelledby={`category-${category}`}>
      <h3 id={`category-${category}`} className="shortcut-category__header">
        {categoryInfo.label}
      </h3>
      <div className="shortcut-category__list" role="list">
        {shortcuts.map((shortcut, index) => (
          <ShortcutRow
            key={`${category}-${index}`}
            shortcut={shortcut}
          />
        ))}
      </div>
    </div>
  );
}
