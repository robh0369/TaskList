import { describe, expect, it } from 'vitest';
import type { Collections, Completion, Task } from '../src/api/types';
import { blankTask, defaultCategories, defaultMembers } from '../src/lib/defaults';
import { buildReport } from '../src/lib/reports';

const NOW = '2026-09-26';

function done(p: Partial<Completion>): Completion {
  return { id: Math.random().toString(), taskId: '', title: 'x', completedBy: 'm1', completedAt: '2026-09-25T15:00:00', dueDate: '', effort: 2, categoryId: 'c1', updatedAt: '', deleted: false, ...p };
}

function data(completions: Completion[], tasks: Task[] = []): Collections {
  return { tasks, completions, projects: [], comments: [], members: defaultMembers(), categories: defaultCategories() };
}

describe('buildReport', () => {
  it('splits workload, crediting shared tasks half each', () => {
    const r = buildReport(data([done({ completedBy: 'm1' }), done({ completedBy: 'both' })]), 7, NOW);
    expect(r.workload.find((l) => l.memberId === 'm1')!.count).toBe(1.5);
    expect(r.workload.find((l) => l.memberId === 'm2')!.count).toBe(0.5);
    expect(r.totalDone).toBe(2);
  });

  it('excludes completions outside the range and deleted ones', () => {
    const r = buildReport(data([done({ completedAt: '2026-09-01T10:00:00' }), done({ deleted: true }), done({})]), 7, NOW);
    expect(r.totalDone).toBe(1);
  });

  it('counts tasks added and still open', () => {
    const tasks = [
      blankTask({ createdAt: '2026-09-24T10:00:00' }),
      blankTask({ createdAt: '2026-08-01T10:00:00' }),
      blankTask({ createdAt: '2026-09-25T10:00:00', status: 'done' }),
      blankTask({ createdAt: '2026-09-25T10:00:00', parentId: 'x' }), // subtask: ignored
    ];
    const r = buildReport(data([], tasks), 7, NOW);
    expect(r.totalAdded).toBe(2);
    expect(r.openCount).toBe(2);
  });

  it('buckets weekly done and added by Monday-start weeks, current week last', () => {
    const r = buildReport(
      data([done({ completedAt: '2026-09-21T09:00:00' }), done({ completedAt: '2026-09-20T09:00:00' })], [blankTask({ createdAt: '2026-09-22T09:00:00' })]),
      30,
      NOW,
    );
    const last = r.weekly[r.weekly.length - 1];
    expect(last).toMatchObject({ weekStart: '2026-09-21', count: 1, added: 1 });
    expect(r.weekly[r.weekly.length - 2].count).toBe(1);
  });

  it('lists stale open tasks, oldest first', () => {
    const tasks = [
      blankTask({ title: 'fresh' }),
      blankTask({ title: 'old', updatedAt: '2026-08-01T00:00:00Z' }),
      blankTask({ title: 'older', updatedAt: '2026-07-01T00:00:00Z' }),
      blankTask({ title: 'closed', updatedAt: '2026-07-01T00:00:00Z', status: 'done' }),
    ];
    expect(buildReport(data([], tasks), 30, NOW).stale.map((t) => t.title)).toEqual(['older', 'old']);
  });

  it('groups by category, most first', () => {
    const r = buildReport(data([done({ categoryId: 'c2' }), done({ categoryId: 'c2' }), done({ categoryId: 'c1' })]), 7, NOW);
    expect(r.categories.map((c) => [c.categoryId, c.count])).toEqual([['c2', 2], ['c1', 1]]);
  });
});
