/**
 * ShortcutRow - Single shortcut display row
 * Renders key combination with description
 */

import { KeyCap } from './KeyCap';
import type { Shortcut } from '@/lib/shortcuts';
import './KeyboardShortcutsModal.css';

interface ShortcutRowProps {
  shortcut: Shortcut;
}

export function ShortcutRow({ shortcut }: ShortcutRowProps) {
  return (
    <div className="shortcut-row" role="listitem">
      <div className="shortcut-row__keys" aria-label={`Shortcut: ${shortcut.keys.join(' plus ')}`}>
        {shortcut.keys.map((key, index) => (
          <KeyCap key={`${key}-${index}`} keyName={key} />
        ))}
      </div>
      <span className="shortcut-row__description">{shortcut.description}</span>
    </div>
  );
}
