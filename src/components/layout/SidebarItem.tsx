import { NavLink, Badge } from '@mantine/core';
import { Icon, type IconName } from '@/components/ui/Icon';
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

  // Render icon - either as Lucide icon name or emoji fallback
  const renderIcon = () => {
    if (!icon) return undefined;
    // Check if it's a Lucide icon name (kebab-case) or emoji
    if (/^[a-z-]+$/.test(icon)) {
      return <Icon name={icon as IconName} size={16} />;
    }
    // Emoji fallback
    return <span style={{ fontSize: 14 }}>{icon}</span>;
  };

  return (
    <NavLink
      label={label}
      leftSection={renderIcon()}
      rightSection={
        count !== undefined && count > 0 ? (
          <Badge size="xs" variant="light" color="gray" radius="sm">
            {count}
          </Badge>
        ) : undefined
      }
      active={isSelected}
      onClick={handleClick}
      variant="subtle"
      style={indent ? { paddingLeft: 32 } : undefined}
    />
  );
}
