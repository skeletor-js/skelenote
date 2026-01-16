import { describe, it, expect } from 'vitest';
import {
  builtInTypes,
  getBuiltInType,
  TaskType,
  NoteType,
  ProjectType,
  AreaType,
  LinkType,
  MeetingType,
  TagType,
  PersonType,
  TemplateType,
  TaskStatusOptions,
  TaskPriorityOptions,
  ProjectStatusOptions,
  TagColorOptions,
  MeetingDurationOptions,
} from '../built-in-types';
import { BuiltInTypeIds } from '../type-definition';

describe('Built-in Types', () => {
  describe('builtInTypes array', () => {
    it('should contain all 9 built-in types', () => {
      expect(builtInTypes).toHaveLength(9);
    });

    it('should include all expected types', () => {
      const typeIds = builtInTypes.map((t) => t.id);
      expect(typeIds).toContain(BuiltInTypeIds.TASK);
      expect(typeIds).toContain(BuiltInTypeIds.NOTE);
      expect(typeIds).toContain(BuiltInTypeIds.PROJECT);
      expect(typeIds).toContain(BuiltInTypeIds.AREA);
      expect(typeIds).toContain(BuiltInTypeIds.LINK);
      expect(typeIds).toContain(BuiltInTypeIds.MEETING);
      expect(typeIds).toContain(BuiltInTypeIds.TAG);
      expect(typeIds).toContain(BuiltInTypeIds.PERSON);
      expect(typeIds).toContain(BuiltInTypeIds.TEMPLATE);
    });

    it('should have all types marked as built-in', () => {
      for (const type of builtInTypes) {
        expect(type.isBuiltIn).toBe(true);
      }
    });
  });

  describe('getBuiltInType', () => {
    it('should return type by ID', () => {
      const task = getBuiltInType(BuiltInTypeIds.TASK);
      expect(task).toBeDefined();
      expect(task?.name).toBe('Task');
    });

    it('should return undefined for non-existent type', () => {
      expect(getBuiltInType('non-existent')).toBeUndefined();
    });

    it('should return correct type for each built-in ID', () => {
      expect(getBuiltInType(BuiltInTypeIds.TASK)).toBe(TaskType);
      expect(getBuiltInType(BuiltInTypeIds.NOTE)).toBe(NoteType);
      expect(getBuiltInType(BuiltInTypeIds.PROJECT)).toBe(ProjectType);
    });
  });
});

describe('TaskType', () => {
  it('should have correct metadata', () => {
    expect(TaskType.id).toBe(BuiltInTypeIds.TASK);
    expect(TaskType.name).toBe('Task');
    expect(TaskType.icon).toBe('circle-check');
    expect(TaskType.hasContent).toBe(true);
    expect(TaskType.isBuiltIn).toBe(true);
  });

  it('should have required title property', () => {
    const titleProp = TaskType.schema.find((p) => p.id === 'title');
    expect(titleProp).toBeDefined();
    expect(titleProp?.type).toBe('text');
    expect(titleProp?.required).toBe(true);
  });

  it('should have status property with correct options', () => {
    const statusProp = TaskType.schema.find((p) => p.id === 'status');
    expect(statusProp).toBeDefined();
    expect(statusProp?.type).toBe('select');
    expect(statusProp?.config?.options).toEqual([...TaskStatusOptions]);
  });

  it('should have priority property with correct options', () => {
    const priorityProp = TaskType.schema.find((p) => p.id === 'priority');
    expect(priorityProp).toBeDefined();
    expect(priorityProp?.type).toBe('select');
    expect(priorityProp?.config?.options).toEqual([...TaskPriorityOptions]);
  });

  it('should have project relation targeting Project type', () => {
    const projectProp = TaskType.schema.find((p) => p.id === 'project');
    expect(projectProp).toBeDefined();
    expect(projectProp?.type).toBe('relation');
    expect(projectProp?.multiple).toBe(false);
    expect(projectProp?.config?.targetTypeIds).toContain(
      BuiltInTypeIds.PROJECT
    );
  });

  it('should have tags relation allowing multiple', () => {
    const tagsProp = TaskType.schema.find((p) => p.id === 'tags');
    expect(tagsProp).toBeDefined();
    expect(tagsProp?.type).toBe('relation');
    expect(tagsProp?.multiple).toBe(true);
    expect(tagsProp?.config?.targetTypeIds).toContain(BuiltInTypeIds.TAG);
  });

  it('should have recurrence property', () => {
    const recurrenceProp = TaskType.schema.find((p) => p.id === 'recurrence');
    expect(recurrenceProp).toBeDefined();
    expect(recurrenceProp?.type).toBe('recurrence');
  });

  it('should have hidden dailyNote relation', () => {
    const dailyNoteProp = TaskType.schema.find((p) => p.id === 'dailyNote');
    expect(dailyNoteProp).toBeDefined();
    expect(dailyNoteProp?.hidden).toBe(true);
    expect(dailyNoteProp?.config?.targetTypeIds).toContain(BuiltInTypeIds.NOTE);
  });
});

describe('NoteType', () => {
  it('should have correct metadata', () => {
    expect(NoteType.id).toBe(BuiltInTypeIds.NOTE);
    expect(NoteType.name).toBe('Note');
    expect(NoteType.hasContent).toBe(true);
  });

  it('should have isDailyNote checkbox property', () => {
    const isDailyNoteProp = NoteType.schema.find((p) => p.id === 'isDailyNote');
    expect(isDailyNoteProp).toBeDefined();
    expect(isDailyNoteProp?.type).toBe('checkbox');
    expect(isDailyNoteProp?.hidden).toBe(true);
  });

  it('should have hidden date property for daily notes', () => {
    const dateProp = NoteType.schema.find((p) => p.id === 'date');
    expect(dateProp).toBeDefined();
    expect(dateProp?.type).toBe('date');
    expect(dateProp?.hidden).toBe(true);
  });
});

describe('ProjectType', () => {
  it('should have correct metadata', () => {
    expect(ProjectType.id).toBe(BuiltInTypeIds.PROJECT);
    expect(ProjectType.name).toBe('Project');
    expect(ProjectType.hasContent).toBe(true);
  });

  it('should have status property with correct options', () => {
    const statusProp = ProjectType.schema.find((p) => p.id === 'status');
    expect(statusProp).toBeDefined();
    expect(statusProp?.config?.options).toEqual([...ProjectStatusOptions]);
  });

  it('should have date range properties', () => {
    const startDateProp = ProjectType.schema.find((p) => p.id === 'startDate');
    const endDateProp = ProjectType.schema.find((p) => p.id === 'endDate');

    expect(startDateProp).toBeDefined();
    expect(endDateProp).toBeDefined();
    expect(startDateProp?.type).toBe('date');
    expect(endDateProp?.type).toBe('date');
  });

  it('should have area relation', () => {
    const areaProp = ProjectType.schema.find((p) => p.id === 'area');
    expect(areaProp).toBeDefined();
    expect(areaProp?.type).toBe('relation');
    expect(areaProp?.config?.targetTypeIds).toContain(BuiltInTypeIds.AREA);
  });
});

describe('AreaType', () => {
  it('should have correct metadata', () => {
    expect(AreaType.id).toBe(BuiltInTypeIds.AREA);
    expect(AreaType.name).toBe('Area');
    expect(AreaType.hasContent).toBe(true);
  });

  it('should have projects relation allowing multiple', () => {
    const projectsProp = AreaType.schema.find((p) => p.id === 'projects');
    expect(projectsProp).toBeDefined();
    expect(projectsProp?.type).toBe('relation');
    expect(projectsProp?.multiple).toBe(true);
    expect(projectsProp?.config?.targetTypeIds).toContain(
      BuiltInTypeIds.PROJECT
    );
  });
});

describe('LinkType', () => {
  it('should have correct metadata', () => {
    expect(LinkType.id).toBe(BuiltInTypeIds.LINK);
    expect(LinkType.name).toBe('Link');
    expect(LinkType.hasContent).toBe(false); // Links don't have rich content
  });

  it('should have required URL property', () => {
    const urlProp = LinkType.schema.find((p) => p.id === 'url');
    expect(urlProp).toBeDefined();
    expect(urlProp?.type).toBe('url');
    expect(urlProp?.required).toBe(true);
  });
});

describe('MeetingType', () => {
  it('should have correct metadata', () => {
    expect(MeetingType.id).toBe(BuiltInTypeIds.MEETING);
    expect(MeetingType.name).toBe('Meeting');
    expect(MeetingType.hasContent).toBe(true);
  });

  it('should have startTime property with time enabled', () => {
    const startTimeProp = MeetingType.schema.find((p) => p.id === 'startTime');
    expect(startTimeProp).toBeDefined();
    expect(startTimeProp?.type).toBe('date');
    expect(startTimeProp?.required).toBe(true);
    expect(startTimeProp?.config?.showTime).toBe(true);
  });

  it('should have duration options', () => {
    const durationProp = MeetingType.schema.find(
      (p) => p.id === 'durationMinutes'
    );
    expect(durationProp).toBeDefined();
    expect(durationProp?.type).toBe('select');
    expect(durationProp?.config?.options).toEqual([...MeetingDurationOptions]);
  });

  it('should have attendees relation to Person', () => {
    const attendeesProp = MeetingType.schema.find((p) => p.id === 'attendees');
    expect(attendeesProp).toBeDefined();
    expect(attendeesProp?.type).toBe('relation');
    expect(attendeesProp?.multiple).toBe(true);
    expect(attendeesProp?.config?.targetTypeIds).toContain(
      BuiltInTypeIds.PERSON
    );
  });
});

describe('TagType', () => {
  it('should have correct metadata', () => {
    expect(TagType.id).toBe(BuiltInTypeIds.TAG);
    expect(TagType.name).toBe('Tag');
    expect(TagType.hasContent).toBe(false);
  });

  it('should have color property with correct options', () => {
    const colorProp = TagType.schema.find((p) => p.id === 'color');
    expect(colorProp).toBeDefined();
    expect(colorProp?.type).toBe('select');
    expect(colorProp?.config?.options).toEqual([...TagColorOptions]);
  });

  it('should have warm palette color options', () => {
    expect(TagColorOptions).toContain('ember');
    expect(TagColorOptions).toContain('sage');
    expect(TagColorOptions).toContain('brick');
    expect(TagColorOptions).toContain('clay');
    expect(TagColorOptions).toContain('ochre');
    expect(TagColorOptions).toContain('slate');
  });
});

describe('PersonType', () => {
  it('should have correct metadata', () => {
    expect(PersonType.id).toBe(BuiltInTypeIds.PERSON);
    expect(PersonType.name).toBe('Person');
    expect(PersonType.hasContent).toBe(true);
  });

  it('should have contact information properties', () => {
    const emailProp = PersonType.schema.find((p) => p.id === 'email');
    const phoneProp = PersonType.schema.find((p) => p.id === 'phone');
    const websiteProp = PersonType.schema.find((p) => p.id === 'website');

    expect(emailProp?.type).toBe('email');
    expect(phoneProp?.type).toBe('phone');
    expect(websiteProp?.type).toBe('url');
  });
});

describe('TemplateType', () => {
  it('should have correct metadata', () => {
    expect(TemplateType.id).toBe(BuiltInTypeIds.TEMPLATE);
    expect(TemplateType.name).toBe('Template');
    expect(TemplateType.hasContent).toBe(true); // Templates have body with placeholders
  });

  it('should have targetTypeId property', () => {
    const targetTypeProp = TemplateType.schema.find(
      (p) => p.id === 'targetTypeId'
    );
    expect(targetTypeProp).toBeDefined();
    expect(targetTypeProp?.type).toBe('text');
    expect(targetTypeProp?.required).toBe(true);
  });

  it('should have isDailyNoteTemplate checkbox', () => {
    const isDailyProp = TemplateType.schema.find(
      (p) => p.id === 'isDailyNoteTemplate'
    );
    expect(isDailyProp).toBeDefined();
    expect(isDailyProp?.type).toBe('checkbox');
  });

  it('should have hidden templateProperties for JSON storage', () => {
    const templatePropsProp = TemplateType.schema.find(
      (p) => p.id === 'templateProperties'
    );
    expect(templatePropsProp).toBeDefined();
    expect(templatePropsProp?.type).toBe('text');
    expect(templatePropsProp?.hidden).toBe(true);
  });
});

describe('Option Constants', () => {
  describe('TaskStatusOptions', () => {
    it('should have all expected statuses', () => {
      expect(TaskStatusOptions).toContain('todo');
      expect(TaskStatusOptions).toContain('in-progress');
      expect(TaskStatusOptions).toContain('waiting');
      expect(TaskStatusOptions).toContain('done');
    });
  });

  describe('TaskPriorityOptions', () => {
    it('should have all expected priorities', () => {
      expect(TaskPriorityOptions).toContain('low');
      expect(TaskPriorityOptions).toContain('medium');
      expect(TaskPriorityOptions).toContain('high');
      expect(TaskPriorityOptions).toContain('urgent');
    });
  });

  describe('ProjectStatusOptions', () => {
    it('should have all expected project statuses', () => {
      expect(ProjectStatusOptions).toContain('active');
      expect(ProjectStatusOptions).toContain('on-hold');
      expect(ProjectStatusOptions).toContain('completed');
      expect(ProjectStatusOptions).toContain('archived');
    });
  });

  describe('MeetingDurationOptions', () => {
    it('should have common meeting durations in minutes', () => {
      expect(MeetingDurationOptions).toContain('15');
      expect(MeetingDurationOptions).toContain('30');
      expect(MeetingDurationOptions).toContain('60');
      expect(MeetingDurationOptions).toContain('90');
    });
  });
});
