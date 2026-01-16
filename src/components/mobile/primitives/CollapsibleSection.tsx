import { useState, type ReactNode } from 'react';
import { Box, UnstyledButton, Text, Badge, Collapse } from '@mantine/core';
import { ChevronRight } from 'lucide-react';
import { IOS_CHEVRON } from '@/lib/constants/ios-styles';

interface CollapsibleSectionProps {
  /** Section title - can be string or ReactNode */
  title: ReactNode;
  /** Badge count next to title */
  count?: number;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Collapsible section for mobile views.
 * Used for backlinks, related objects, and other expandable content.
 */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  // Generate accessible label from title
  const titleText = typeof title === 'string' ? title : 'Section';
  const itemCount = count ?? 0;

  return (
    <Box>
      <UnstyledButton
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 0',
          width: '100%',
        }}
        aria-expanded={isOpen}
        aria-label={`${titleText}${itemCount > 0 ? `, ${itemCount} items` : ''}`}
      >
        <ChevronRight
          size={IOS_CHEVRON.disclosure.size}
          strokeWidth={IOS_CHEVRON.disclosure.strokeWidth}
          style={{
            color: IOS_CHEVRON.disclosure.color,
            transform: isOpen ? 'rotate(90deg)' : 'none',
            transition: 'transform 150ms ease',
            flexShrink: 0,
          }}
        />
        {typeof title === 'string' ? (
          <Text size="sm" fw={500} c="dimmed">
            {title}
          </Text>
        ) : (
          title
        )}
        {count !== undefined && count > 0 && (
          <Badge size="xs" variant="light" color="gray">
            {count}
          </Badge>
        )}
      </UnstyledButton>

      <Collapse in={isOpen}>
        <Box pl="md" pt={4} pb="sm">
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
