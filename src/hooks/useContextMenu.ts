import { useCallback, useState } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface UseContextMenuResult {
  isOpen: boolean;
  position: ContextMenuPosition;
  openContextMenu: (e: React.MouseEvent) => void;
  closeContextMenu: () => void;
}

export function useContextMenu(): UseContextMenuResult {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

  const openContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    position,
    openContextMenu,
    closeContextMenu,
  };
}
