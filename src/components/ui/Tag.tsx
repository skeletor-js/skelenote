import './Tag.css';

export type TagColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink';

interface TagProps {
  name: string;
  color?: TagColor;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function Tag({ name, color = 'gray', size = 'md', onClick }: TagProps) {
  const isClickable = !!onClick;

  return (
    <span
      className={`tag tag--${color} tag--${size} ${isClickable ? 'tag--clickable' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined
      }
    >
      <span className="tag__dot" />
      <span className="tag__name">#{name}</span>
    </span>
  );
}
