/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { QuickCaptureSheet } from '../QuickCaptureSheet';
import React from 'react';
import { BuiltInTypeIds } from '@/lib/types';
import { useObjects } from '@/contexts';
import { useLinkToDaily, useReducedMotion } from '@/hooks';
import { setupSheetMocks, renderWithProvider } from './test-utils';

setupSheetMocks();

// Mock Dependencies
vi.mock('@/contexts', () => ({
  useObjects: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useLinkToDaily: vi.fn(),
  useReducedMotion: vi.fn(),
}));

vi.mock('@/lib/templates', () => ({
  createFromTemplate: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock MANTINE Portal (to render content in-tree for testing)
vi.mock('@mantine/core', async () => {
  const actual =
    await vi.importActual<typeof import('@mantine/core')>('@mantine/core');
  return {
    ...actual,
    Portal: ({ children }: any) => (
      <div data-testid="mantine-portal">{children}</div>
    ),
  };
});

vi.mock('lucide-react', async () => {
  const actual =
    await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
  };
});

// Mock Primitives
vi.mock('../../primitives', () => ({
  PropertyChip: ({ label, value, onPress }: any) => (
    <button onClick={onPress} data-testid={`chip-${label.toLowerCase()}`}>
      {label}
      {value ? `: ${value}` : ''}
    </button>
  ),
}));

// Mock Sub-sheets
vi.mock('../TemplatePickerSheet', () => ({
  TemplatePickerSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-template">Template Picker</div> : null,
}));
vi.mock('../DueDateSheet', () => ({
  DueDateSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-duedate">DueDate Sheet</div> : null,
}));
vi.mock('../PriorityPickerSheet', () => ({
  PriorityPickerSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-priority">Priority Sheet</div> : null,
  getPriorityInfo: () => ({ label: 'High', color: 'red' }),
}));
vi.mock('../ProjectPickerSheet', () => ({
  ProjectPickerSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-project">Project Picker</div> : null,
}));
vi.mock('../AreaPickerSheet', () => ({
  AreaPickerSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-area">Area Picker</div> : null,
}));
vi.mock('../TagPickerSheet', () => ({
  TagPickerSheet: ({ opened }: any) =>
    opened ? <div data-testid="sheet-tags">Tag Picker</div> : null,
}));

describe('QuickCaptureSheet', () => {
  const mocks = {
    store: {
      create: vi.fn(),
      get: vi.fn(),
    },
    refreshData: vi.fn(),
    linkToDaily: vi.fn(),
    onClose: vi.fn(),
    onItemCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useObjects as any).mockReturnValue({
      store: mocks.store,
      refreshData: mocks.refreshData,
    });

    (useLinkToDaily as any).mockReturnValue({
      linkToDaily: mocks.linkToDaily,
    });

    (useReducedMotion as any).mockReturnValue(false);

    mocks.store.create.mockReturnValue({ id: 'new-id' });
  });

  it('renders correctly when opened', () => {
    renderWithProvider(
      <QuickCaptureSheet opened={true} onClose={mocks.onClose} />
    );
    expect(screen.getByText('Quick Capture')).toBeDefined();
    // CircleCheck icon for task type is rendered
    expect(document.querySelector('.lucide-circle-check')).toBeTruthy();
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeDefined();
  });

  it('handles typing title and creating task', () => {
    renderWithProvider(
      <QuickCaptureSheet
        opened={true}
        onClose={mocks.onClose}
        onItemCreated={mocks.onItemCreated}
      />
    );

    const input = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(input, { target: { value: 'New Task' } });

    // Click Capture button
    fireEvent.click(screen.getByText('Capture'));

    expect(mocks.store.create).toHaveBeenCalledWith({
      typeId: BuiltInTypeIds.TASK,
      properties: expect.objectContaining({
        title: 'New Task',
        status: 'todo',
      }),
      inboxed: true,
    });
    expect(mocks.linkToDaily).toHaveBeenCalled();
    expect(mocks.onClose).toHaveBeenCalled();
    expect(mocks.onItemCreated).toHaveBeenCalledWith('new-id');
  });

  it('changes type to Link and updates UI', async () => {
    renderWithProvider(
      <QuickCaptureSheet opened={true} onClose={mocks.onClose} />
    );

    const linkBtn = screen.getByLabelText('Link');
    fireEvent.click(linkBtn);

    expect(screen.getByPlaceholderText('Link title')).toBeDefined();
    expect(screen.getByPlaceholderText('https://...')).toBeDefined();

    const input = screen.getByPlaceholderText('Link title');
    fireEvent.change(input, { target: { value: 'My Site' } });

    const urlInput = screen.getByPlaceholderText('https://...');
    fireEvent.change(urlInput, { target: { value: 'example.com' } });

    fireEvent.click(screen.getByText('Capture'));

    expect(mocks.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        typeId: BuiltInTypeIds.LINK,
        properties: expect.objectContaining({
          title: 'My Site',
          url: 'example.com',
        }),
      })
    );
  });

  it('opens project picker sheet', () => {
    renderWithProvider(
      <QuickCaptureSheet opened={true} onClose={mocks.onClose} />
    );
    fireEvent.click(screen.getByTestId('chip-project'));
    expect(screen.getByTestId('sheet-project')).toBeDefined(); // Opened
  });
});
