import './SidebarItem.css';
import { Badge } from '@/components/ui';
import { useSidebar } from '@/contexts';

interface SidebarItemProps {
  id: string;
  icon?: string;
  label: string;
  count?: number;
  indent?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  id,
  icon,
  label,
  count,
  indent = false,
  onClick,
}: SidebarItemProps) {
  const { selectedItem, setSelectedItem } = useSidebar();
  const isSelected = selectedItem === id;

  const handleClick = () => {
    setSelectedItem(id);
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      className={`sidebar-item ${isSelected ? 'sidebar-item--selected' : ''} ${indent ? 'sidebar-item--indent' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-current={isSelected ? 'page' : undefined}
    >
      {icon && <span className="sidebar-item__icon">{icon}</span>}
      <span className="sidebar-item__label">{label}</span>
      {count !== undefined && count > 0 && <Badge count={count} />}
    </button>
  );
}
