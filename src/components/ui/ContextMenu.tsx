import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
}

export function ContextMenu({ items, position, isOpen, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use capture phase for click to ensure we catch it before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position if menu would overflow right edge
    if (position.x + rect.width > viewportWidth - 8) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (position.y + rect.height > viewportHeight - 8) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    // Ensure menu doesn't go off left/top edges
    adjustedX = Math.max(8, adjustedX);
    adjustedY = Math.max(8, adjustedY);

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [isOpen, position]);

  if (!isOpen) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          className={`context-menu__item ${item.variant === 'danger' ? 'context-menu__item--danger' : ''} ${item.disabled ? 'context-menu__item--disabled' : ''}`}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => handleItemClick(item)}
        >
          {item.icon && (
            <span className="context-menu__icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="context-menu__label">{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}
