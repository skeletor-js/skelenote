/**
 * Icon component for Skelenote
 * Renders Lucide icons by name string
 */

import { icons, LucideProps } from 'lucide-react';
import type { IconName } from '@/lib/icons';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  /** The name of the icon to render (kebab-case) */
  name: IconName;
  /** Size in pixels (default: 16) */
  size?: number;
}

/**
 * Convert kebab-case to PascalCase for Lucide icon lookup
 * e.g., 'circle-check' -> 'CircleCheck'
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Icon component that renders Lucide icons by name
 *
 * @example
 * <Icon name="circle-check" size={20} />
 * <Icon name="file-text" color="var(--mantine-color-blue-6)" />
 */
export function Icon({ name, size = 16, ...props }: IconProps) {
  const pascalName = toPascalCase(name);
  const IconComponent = icons[pascalName as keyof typeof icons];

  if (!IconComponent) {
    console.warn(`Icon "${name}" (${pascalName}) not found in Lucide icons`);
    return null;
  }

  return <IconComponent size={size} {...props} />;
}

// Re-export types for convenience
export type { IconName };
