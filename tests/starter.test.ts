import { describe, expect, it } from 'vitest';
import type { Collections } from '../src/api/types';
import { defaultCategories, defaultMembers } from '../src/lib/defaults';
import { HIRE_CATEGORY_ID, planStarterImport, STARTER_TASKS } from '../src/lib/starter';

function empty(): Collections {
  return { tasks: [], completions: [], projects: [], comments: [], members: defaultMembers(), categories: defaultCategories() };
}

describe('starter list', () => {
  it('matches the handwritten list: 29 tasks, no daily chores', () => {
    expect(STARTER_TASKS).toHaveLength(29);
    const titles = STARTER_TASKS.map((r) => r[0].toLowerCase());
    expect(titles.some((t) => /dishes|laundry|meal prep/.test(t))).toBe(false);
    expect(STARTER_TASKS.filter((r) => r[2] === HIRE_CATEGORY_ID)).toHaveLength(7);
    // Back deck appeared on both lists → one shared task.
    expect(STARTER_TASKS.filter((r) => r[0] === 'Clean up back deck').map((r) => r[1])).toEqual(['both']);
  });

  it('plans tasks, the Hire out category and member names', () => {
    const plan = planStarterImport(empty(), 'm1');
    expect(plan.tasks).toHaveLength(29);
    expect(plan.tasks.every((t) => t.status === 'open' && !t.dueDate && t.createdBy === 'm1')).toBe(true);
    expect(plan.tasks.filter((t) => t.priority === 'high')).toHaveLength(9);
    expect(plan.categories.map((c) => c.name)).toEqual(['Hire out']);
    expect(plan.members.map((m) => m.name)).toEqual(['Rob', 'Rebecca']);
  });

  it('is idempotent and never renames people you already named', () => {
    const data = empty();
    const first = planStarterImport(data);
    data.tasks.push(...first.tasks);
    data.categories.push(...first.categories);
    data.members[0].name = 'Robert';
    data.members[1].name = 'Rebecca';
    const second = planStarterImport(data);
    expect(second.tasks).toHaveLength(0);
    expect(second.categories).toHaveLength(0);
    expect(second.members).toHaveLength(0);
  });
});
