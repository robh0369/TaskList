import { describe, expect, it } from 'vitest';
import type { Collections, Completion } from '../src/api/types';
import { blankTask, defaultCategories, defaultMembers } from '../src/lib/defaults';
import { buildReport } from '../src/lib/reports';

const NOW = '2026-09-26';

function done(p: Partial<Completion>): Completion {
  return { id: Math.random().toString(), taskId: '', title: 'x', completedBy: 'm1', completedAt: '2026-09-25T15:00:00', dueDate: '', effort: 2, categoryId: 'c1', updatedAt: '', deleted: false, ...p };
}

function data(completions: Completion[], tasks = [blankTask()]): Collections {
  return { tasks, completions, projects: [], comments: [], members: defaultMembers(), categories: defaultCategories() };
}

describe('buildReport', () => {
  it('splits workload, crediting shared tasks half each', () => {
    const r = buildReport(data([done({ completedBy: 'm1', effort: 4 }), done({ completedBy: 'both', effort: 2 })]), 7, NOW);
    const m1 = r.workload.find((l) => l.memberId === 'm1')!;
    const m2 = r.workload.find((l) => l.memberId === 'm2')!;
    expect(m1).toMatchObject({ count: 1.5 });
    expect(m2).toMatchObject({ count: 0.5 });
    expect(r.totalDone).toBe(2);
    expect(r.openCount).toBe(1);
  });

  it('excludes completions outside the range and deleted ones', () => {
    const r = buildReport(data([done({ completedAt: '2026-09-01T10:00:00' }), done({ deleted: true }), done({})]), 7, NOW);
    expect(r.totalDone).toBe(1);
  });

  it('computes on-time rate only over dated completions', () => {
    const r = buildReport(
      data([
        done({ dueDate: '2026-09-25' }), // on time
        done({ dueDate: '2026-09-20' }), // late
        done({ dueDate: '' }), // no due date → ignored
      ]),
      30,
      NOW,
    );
    expect(r.onTimeRate).toBe(0.5);
  });

  it('buckets weekly trend by Monday-start weeks, current week last', () => {
    const r = buildReport(data([done({ completedAt: '2026-09-21T09:00:00' }), done({ completedAt: '2026-09-20T09:00:00' })]), 30, NOW);
    const last = r.weekly[r.weekly.length - 1];
    expect(last.weekStart).toBe('2026-09-21');
    expect(last.count).toBe(1);
    expect(r.weekly[r.weekly.length - 2].count).toBe(1);
  });

  it('finds overdue, due-this-week and stale tasks', () => {
    const tasks = [
      blankTask({ title: 'late', dueDate: '2026-09-20' }),
      blankTask({ title: 'soon', dueDate: '2026-09-28' }),
      blankTask({ title: 'old', updatedAt: '2026-08-01T00:00:00Z' }),
      blankTask({ title: 'closed', dueDate: '2026-09-01', status: 'done' }),
    ];
    const r = buildReport(data([], tasks), 30, NOW);
    expect(r.overdue.map((t) => t.title)).toEqual(['late']);
    expect(r.dueThisWeek.map((t) => t.title)).toEqual(['soon']);
    expect(r.stale.map((t) => t.title)).toEqual(['old']);
  });

  it('groups by category, most first', () => {
    const r = buildReport(data([done({ categoryId: 'c2' }), done({ categoryId: 'c2' }), done({ categoryId: 'c1' })]), 7, NOW);
    expect(r.categories.map((c) => [c.categoryId, c.count])).toEqual([['c2', 2], ['c1', 1]]);
  });
});
