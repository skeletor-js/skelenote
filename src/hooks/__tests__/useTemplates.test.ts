/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplates } from '..';

// Mocks
const mockStore = { id: 'mock-store' };
const mockRefreshData = vi.fn();
const mockNavigateToObject = vi.fn();

vi.mock('@/contexts', () => ({
  useObjects: () => ({
    store: mockStore,
    isLoading: false,
    refreshData: mockRefreshData,
  }),
  useAnalyticsSafe: () => ({ track: vi.fn() }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    navigateToObject: mockNavigateToObject,
  }),
}));

// Mock lib/templates functions
const mockGetTemplates = vi.fn();
const mockGetDailyNoteTemplate = vi.fn();
const mockGetTemplatesForType = vi.fn();
const mockGetTemplate = vi.fn();
const mockCreateTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();
const mockDuplicateTemplate = vi.fn();
const mockCreateFromTemplate = vi.fn();
const mockSetDailyNoteTemplate = vi.fn();
const mockClearDailyNoteTemplate = vi.fn();

vi.mock('@/lib/templates', () => ({
  getTemplates: (store: any) => mockGetTemplates(store),
  getDailyNoteTemplate: (store: any) => mockGetDailyNoteTemplate(store),
  getTemplatesForType: (store: any, type: string) =>
    mockGetTemplatesForType(store, type),
  getTemplate: (store: any, id: string) => mockGetTemplate(store, id),
  createTemplate: (store: any, input: any) => mockCreateTemplate(store, input),
  updateTemplate: (store: any, id: string, input: any) =>
    mockUpdateTemplate(store, id, input),
  deleteTemplate: (store: any, id: string) => mockDeleteTemplate(store, id),
  duplicateTemplate: (store: any, id: string) =>
    mockDuplicateTemplate(store, id),
  createFromTemplate: (store: any, id: string, opts: any) =>
    mockCreateFromTemplate(store, id, opts),
  setDailyNoteTemplate: (id: string) => mockSetDailyNoteTemplate(id),
  clearDailyNoteTemplate: () => mockClearDailyNoteTemplate(),
}));

describe('useTemplates Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return templates', () => {
    const templates = [
      { id: 't1', name: 'A' },
      { id: 't2', name: 'B' },
    ];
    mockGetTemplates.mockReturnValue(templates);

    const { result } = renderHook(() => useTemplates());

    expect(result.current.templates).toEqual(templates);
    expect(mockGetTemplates).toHaveBeenCalledWith(mockStore);
  });

  it('should create template', () => {
    const { result } = renderHook(() => useTemplates());
    const input = { name: 'New' };
    mockCreateTemplate.mockReturnValue({ id: 'new', ...input });

    act(() => {
      result.current.create(input as any);
    });

    expect(mockCreateTemplate).toHaveBeenCalledWith(mockStore, input);
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should update template', () => {
    const { result } = renderHook(() => useTemplates());
    const input = { name: 'Updated' };

    act(() => {
      result.current.update('t1', input as any);
    });

    expect(mockUpdateTemplate).toHaveBeenCalledWith(mockStore, 't1', input);
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should delete template', () => {
    const { result } = renderHook(() => useTemplates());
    mockDeleteTemplate.mockReturnValue(true);

    act(() => {
      result.current.remove('t1');
    });

    expect(mockDeleteTemplate).toHaveBeenCalledWith(mockStore, 't1');
    expect(mockRefreshData).toHaveBeenCalled();
  });

  it('should create object from template and navigate', () => {
    const { result } = renderHook(() => useTemplates());
    mockCreateFromTemplate.mockReturnValue({ objectId: 'obj-1' });

    act(() => {
      result.current.createObject('t1', { navigate: true });
    });

    expect(mockCreateFromTemplate).toHaveBeenCalled();
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockNavigateToObject).toHaveBeenCalledWith('obj-1');
  });

  it('should handle daily note template settings', () => {
    const { result } = renderHook(() => useTemplates());

    act(() => {
      result.current.setDailyNoteTemplate('t1');
    });
    expect(mockSetDailyNoteTemplate).toHaveBeenCalledWith('t1');

    act(() => {
      result.current.setDailyNoteTemplate(null);
    });
    expect(mockClearDailyNoteTemplate).toHaveBeenCalled();
  });

  it('should duplicate a template', () => {
    const { result } = renderHook(() => useTemplates());
    const duplicated = { id: 't2', name: 'A (Copy)' };
    mockDuplicateTemplate.mockReturnValue(duplicated);

    let returnValue: any;
    act(() => {
      returnValue = result.current.duplicate('t1');
    });

    expect(mockDuplicateTemplate).toHaveBeenCalledWith(mockStore, 't1');
    expect(mockRefreshData).toHaveBeenCalled();
    expect(returnValue).toEqual(duplicated);
  });

  it('should get templates for type', () => {
    const { result } = renderHook(() => useTemplates());
    const typeTemplates = [{ id: 't1', name: 'Task Template' }];
    mockGetTemplatesForType.mockReturnValue(typeTemplates);

    const returnValue = result.current.getForType('task');

    expect(mockGetTemplatesForType).toHaveBeenCalledWith(mockStore, 'task');
    expect(returnValue).toEqual(typeTemplates);
  });

  it('should get template by ID', () => {
    const { result } = renderHook(() => useTemplates());
    const template = { id: 't1', name: 'Template 1' };
    mockGetTemplate.mockReturnValue(template);

    const returnValue = result.current.getById('t1');

    expect(mockGetTemplate).toHaveBeenCalledWith(mockStore, 't1');
    expect(returnValue).toEqual(template);
  });

  it('should get daily note template', () => {
    const dailyTemplate = { id: 'daily', name: 'Daily Note' };
    mockGetDailyNoteTemplate.mockReturnValue(dailyTemplate);

    const { result } = renderHook(() => useTemplates());

    expect(result.current.dailyNoteTemplate).toEqual(dailyTemplate);
  });

  it('should handle create error gracefully', () => {
    const { result } = renderHook(() => useTemplates());
    mockCreateTemplate.mockImplementation(() => {
      throw new Error('Create failed');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let returnValue: any;
    act(() => {
      returnValue = result.current.create({ name: 'Test' } as any);
    });

    expect(returnValue).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle update error gracefully', () => {
    const { result } = renderHook(() => useTemplates());
    mockUpdateTemplate.mockImplementation(() => {
      throw new Error('Update failed');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let returnValue: any;
    act(() => {
      returnValue = result.current.update('t1', { name: 'Updated' } as any);
    });

    expect(returnValue).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle delete error gracefully', () => {
    const { result } = renderHook(() => useTemplates());
    mockDeleteTemplate.mockImplementation(() => {
      throw new Error('Delete failed');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let returnValue: any;
    act(() => {
      returnValue = result.current.remove('t1');
    });

    expect(returnValue).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle duplicate error gracefully', () => {
    const { result } = renderHook(() => useTemplates());
    mockDuplicateTemplate.mockImplementation(() => {
      throw new Error('Duplicate failed');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let returnValue: any;
    act(() => {
      returnValue = result.current.duplicate('t1');
    });

    expect(returnValue).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle createObject error gracefully', () => {
    const { result } = renderHook(() => useTemplates());
    mockCreateFromTemplate.mockImplementation(() => {
      throw new Error('Create from template failed');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let returnValue: any;
    act(() => {
      returnValue = result.current.createObject('t1', { navigate: false });
    });

    expect(returnValue).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not navigate when navigate option is false', () => {
    const { result } = renderHook(() => useTemplates());
    mockCreateFromTemplate.mockReturnValue({ objectId: 'obj-2' });

    act(() => {
      result.current.createObject('t1', { navigate: false });
    });

    expect(mockCreateFromTemplate).toHaveBeenCalled();
    expect(mockNavigateToObject).not.toHaveBeenCalled();
  });

  it('should provide correct count', () => {
    const templates = [
      { id: 't1', name: 'A' },
      { id: 't2', name: 'B' },
      { id: 't3', name: 'C' },
    ];
    mockGetTemplates.mockReturnValue(templates);

    const { result } = renderHook(() => useTemplates());

    expect(result.current.count).toBe(3);
  });
});
