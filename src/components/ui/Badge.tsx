import './Badge.css';

interface BadgeProps {
  count: number;
  max?: number;
}

export function Badge({ count, max = 99 }: BadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span className="badge" aria-label={`${count} items`}>
      {displayCount}
    </span>
  );
}
